# Private local operator UI. No credential arguments, history, transcript or files.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
$pythonRuntime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$resultFile = Join-Path $taskRoot '.cache\preview-admin-setup-result.json'
$form = New-Object System.Windows.Forms.Form
$form.Text = 'RISHAD 266 — Preview administrator setup'
$form.Size = New-Object System.Drawing.Size(600,390)
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$labels = @('Preview ONLY: test.kivo-d81.pages.dev / bassam-db-preview', 'Username: exactly 10 ASCII digits', 'Password: 6 digits, not repeated or sequential', 'Confirm password')
$fields = @()
for ($i=0; $i -lt 4; $i++) {
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $labels[$i]; $label.Location = New-Object System.Drawing.Point(20,(20+$i*65))
    $label.Size = New-Object System.Drawing.Size(550,25); $form.Controls.Add($label)
    if ($i -gt 0) {
        $box = New-Object System.Windows.Forms.TextBox
        $box.Location = New-Object System.Drawing.Point(20,(45+$i*65))
        $box.Size = New-Object System.Drawing.Size(540,25)
        $box.UseSystemPasswordChar = ($i -gt 1)
        $box.MaxLength = 128
        $form.Controls.Add($box); $fields += $box
    }
}
$submit = New-Object System.Windows.Forms.Button
$submit.Text = 'Create and verify Preview administrator'
$submit.Location = New-Object System.Drawing.Point(20,305)
$submit.Size = New-Object System.Drawing.Size(540,35)
$form.Controls.Add($submit)
$form.AcceptButton = $submit
$submit.Add_Click({
    if ($fields[0].Text -cnotmatch '^[0-9]{10}$' -or $fields[1].Text -cnotmatch '^[0-9]{6}$' -or $fields[1].Text -cne $fields[2].Text) {
        [System.Windows.Forms.MessageBox]::Show('Check username length, password length and confirmation. No data was sent.','Check input') | Out-Null
        return
    }
    $submit.Enabled = $false
    $form.UseWaitCursor = $true
    try {
        $info = New-Object System.Diagnostics.ProcessStartInfo
        $info.FileName = $pythonRuntime
        $info.ArgumentList.Add('-I')
        $info.ArgumentList.Add((Join-Path $PSScriptRoot 'provision_preview_admin.py'))
        $info.UseShellExecute = $false; $info.CreateNoWindow = $true
        $info.RedirectStandardInput = $true; $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
        $info.StandardInputEncoding = New-Object System.Text.UTF8Encoding($false)
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $info
        [void]$process.Start()
        $payload = @{username=$fields[0].Text;password=$fields[1].Text} | ConvertTo-Json -Compress
        $process.StandardInput.Write($payload); $process.StandardInput.Close()
        $payload = $null
        foreach ($field in $fields) {$field.Clear()}
        $output = $process.StandardOutput.ReadToEnd()
        $discardedError = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        $result = $output | ConvertFrom-Json
        # Whitelist the only metadata persisted. Never write stdout/stderr verbatim.
        $safe = @{status=$result.status;created=[bool]$result.created;preview_only=[bool]$result.preview_only;role=$result.role;checks=$result.checks;code=$result.code;url=$result.url}
        $safe | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $resultFile -Encoding utf8
        if ($result.status -eq 'ok') {
            [System.Windows.Forms.MessageBox]::Show('Preview administrator created. Login and administrator permissions verified. No credentials were saved by this tool. Open test.kivo-d81.pages.dev to sign in.','Completed') | Out-Null
            $form.Close()
        } else {
            [System.Windows.Forms.MessageBox]::Show(('Setup status: '+$result.code+'. Created: '+$result.created+'. No credentials were logged. Contact Codex before retrying.'),'Setup stopped') | Out-Null
            $form.Close()
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show('Local setup stopped. Do not repeat before checking the account state with Codex. No error payload was logged.','Setup stopped') | Out-Null
        $form.Close()
    } finally {
        $output=$null; $discardedError=$null; $payload=$null
        foreach ($field in $fields) {$field.Clear()}
        $form.UseWaitCursor=$false
    }
})
[void]$form.ShowDialog()
$form.Dispose()
