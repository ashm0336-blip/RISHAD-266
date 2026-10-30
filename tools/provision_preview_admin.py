"""Explicit Preview-only first administrator setup. Credentials arrive on stdin only.

Use provision_preview_admin.ps1 for private interactive input. Never pass credentials
as arguments, print them, save SQL, or persist login cookies. No deployment/R2 calls.
"""
import hashlib
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import sys
import time
import tomllib
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ACCOUNT = '74d8c1d049621ecdda47d3cd74306703'
DATABASE = '9b671cce-2bf3-46e9-84b5-23645227f0e0'
BASE = 'https://test.kivo-d81.pages.dev'
USERS = 'bassam_auth_users_v1'


class SafeError(Exception):
    pass


def validate_input(data):
    username, password = data.get('username', ''), data.get('password', '')
    if not isinstance(username, str) or not re.fullmatch(r'[0-9]{10}', username):
        raise SafeError('username-policy')
    if (not isinstance(password, str) or not re.fullmatch(r'[0-9]{6}', password)
            or len(set(password)) == 1 or password in '01234567890123456789'
            or password in '98765432109876543210'):
        raise SafeError('password-policy')
    return username, password


def plan(username, password):
    validate_input({'username': username, 'password': password})
    salt = secrets.token_bytes(16)
    ph = 'p2$100000$' + salt.hex() + '$' + hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000).hex()
    user = {'id': 'su', 'un': username, 'name': 'مدير المنصة', 'role': 'super', 'ph': ph, 'mc': 0, 'dis': 0}
    # The first statement and the primary key protect against existing accounts and
    # competing provisioning requests. All statements are ONE D1 batch transaction.
    return [
        {'sql': "SELECT CASE WHEN EXISTS(SELECT 1 FROM kv WHERE k=?1) THEN json_extract('{}','EXISTING_ACCOUNT_REFUSED') END", 'params': [USERS]},
        {'sql': 'INSERT INTO kv(k,seq,v) VALUES(?1,0,?2)', 'params': [USERS, json.dumps([user], ensure_ascii=False)]},
        {'sql': "INSERT INTO meta(k,v) VALUES('rev','1') ON CONFLICT(k) DO UPDATE SET v=CAST(meta.v AS INTEGER)+1"},
        {'sql': "INSERT INTO revs(k,rev) SELECT ?1,CAST(v AS INTEGER) FROM meta WHERE k='rev' ON CONFLICT(k) DO UPDATE SET rev=excluded.rev", 'params': [USERS]},
        {'sql': "INSERT INTO sec(ts,uid,act,target,detail) VALUES(?1,'su','provision','account','Explicit Preview first administrator; no credential payload')", 'params': [str(int(time.time()*1000))]},
    ]


def request_json(url, body=None, headers=None, opener=None):
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers={
        'Content-Type': 'application/json', 'User-Agent': 'RISHAD266-Preview-Provision/1.0', **(headers or {})})
    with (opener.open(req, timeout=40) if opener else urllib.request.urlopen(req, timeout=40)) as response:
        raw = response.read().decode('utf-8')
        return json.loads(raw) if 'application/json' in response.headers.get('Content-Type', '') else raw


def credentials():
    config = tomllib.loads((ROOT/'config/wrangler.preview.toml').read_text(encoding='utf-8'))
    db = config.get('d1_databases', [])
    if (config.get('account_id') != ACCOUNT or len(db) != 1 or db[0].get('database_id') != DATABASE
            or db[0].get('database_name') != 'bassam-db-preview' or db[0].get('binding') != 'DB'
            or set(config) - {'name', 'account_id', 'compatibility_date', 'd1_databases'}):
        raise SafeError('preview-config-mismatch')
    location = Path(os.environ['APPDATA'])/'xdg.config/.wrangler/config/default.toml'
    token = tomllib.loads(location.read_text(encoding='utf-8')).get('oauth_token')
    if not token:
        raise SafeError('wrangler-not-authenticated')
    return {'Authorization': 'Bearer ' + token}


def d1(headers, batch):
    result = request_json(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/d1/database/{DATABASE}/query', {'batch': batch}, headers)
    if not result.get('success') or not all(item.get('success') for item in result.get('result', [])):
        raise SafeError('preview-d1-operation-failed')
    return result['result']


def preflight(headers):
    project = request_json(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/pages/projects/0', headers=headers)['result']
    preview = project['deployment_configs']['preview']
    deployed = project['latest_deployment']
    if (project['name'] != '0' or project['subdomain'] != 'kivo-d81.pages.dev' or project['production_branch'] == 'test'
            or preview['d1_databases']['DB']['id'] != DATABASE or deployed['environment'] != 'preview'
            or deployed['deployment_trigger']['metadata']['branch'] != 'test' or deployed['d1_databases']['DB']['id'] != DATABASE):
        raise SafeError('preview-target-mismatch')
    rows = d1(headers, [{'sql': "SELECT (SELECT COUNT(*) FROM kv WHERE k='bassam_auth_users_v1') AS users,(SELECT v FROM meta WHERE k='schema_version') AS version,(SELECT v FROM meta WHERE k='authz_mode') AS mode"}])[0]['results'][0]
    if rows['users'] != 0:
        raise SafeError('existing-account-refused')
    if str(rows['version']) != '4' or rows['mode'] != 'enforce':
        raise SafeError('preview-schema-mismatch')
    return project['canonical_deployment']['id']


def verify_login(username, password):
    client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    headers = {'Origin': BASE}
    login = request_json(BASE+'/api/login', {'u': username, 'p': password}, headers, client)
    if login.get('ok') != 1 or login.get('role') != 'super' or login.get('mustChange'):
        raise SafeError('administrator-login-check-failed')
    checks = ['login-super-original-policy']
    try:
        for path in ['/api/overview', '/api/authz/log?limit=1', '/api/dstats']:
            result = request_json(BASE+path, headers=headers, opener=client)
            if result.get('ok') != 1:
                raise SafeError('administrator-permission-check-failed')
            checks.append(path)
        html = request_json(BASE+'/', headers=headers, opener=client)
        if '__BS_BOOT' not in html or 'p2$100000$' in html:
            raise SafeError('administrator-shell-check-failed')
        checks.append('authenticated-shell-no-password-hash')
    finally:
        request_json(BASE+'/api/logout', {}, headers, client)
    return checks


def main():
    created = False
    try:
        headers = credentials()
        production_id = preflight(headers)
        if '--check' in sys.argv:
            print(json.dumps({'status': 'ready', 'preview_only': True, 'existing_accounts': False}))
            return 0
        sys.stdin.reconfigure(encoding='utf-8')
        data = json.load(sys.stdin)
        username, password = validate_input(data)
        d1(headers, plan(username, password))
        created = True
        checks = verify_login(username, password)
        current = request_json(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/pages/projects/0', headers=headers)['result']
        if current['canonical_deployment']['id'] != production_id:
            raise SafeError('production-deployment-changed-externally')
        print(json.dumps({'status': 'ok', 'created': True, 'preview_only': True, 'role': 'super', 'checks': checks, 'url': BASE+'/#/sysadmin/overview'}))
        return 0
    except Exception as error:
        # Never print exceptions, HTTP bodies, inputs, SQL or tracebacks containing credentials.
        code = str(error) if isinstance(error, SafeError) else 'operation-failed-check-account-state-before-retry'
        print(json.dumps({'status': 'failed', 'created': created, 'code': code}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
