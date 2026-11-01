/* RISHAD-266 · unify (batch 1): one shared step that brings a test database seeded with the historical
   SQL fixture (tests/fixtures/gen_fixture.py) to the CURRENT schema's storage, exactly as tasks_fx.world()
   already does. Tests that build their own private world from the legacy seed must call it after applySql,
   otherwise the schema-10 worker correctly refuses every request (operations/irshad/seized legacy source
   present) and the test never reaches its real assertions.
   It runs the real canonical cutover code of the tested worker (no reconstruction, no relaxed guard),
   and each installer asserts that accounts, password hashes, permissions, sessions and epoch are unchanged. */
import { installIrshadFixture } from './irshad_legacy_seed_fx.mjs';
import { installBusinessFixture } from './business_legacy_seed_fx.mjs';
import { installOperationalFixture } from './operational_legacy_seed_fx.mjs';

export async function installCurrentSchemaFixture(env) {
  const schema = () => env.DB.q("SELECT v FROM meta WHERE k='schema_version'")[0]?.v;
  const v = schema();
  if (['8', '9', '10'].includes(v)) await installIrshadFixture(env);
  if (['9', '10'].includes(v)) await installBusinessFixture(env);
  if (v === '10') await installOperationalFixture(env);
  return v;
}
