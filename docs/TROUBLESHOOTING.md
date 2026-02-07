# Troubleshooting

## npm install fails with EPERM or esbuild EFTYPE

You may see:

- **EPERM: operation not permitted, rmdir** in `node_modules`
- **spawnSync ... esbuild.exe EFTYPE** when installing

This usually happens when:

1. Cursor/VS Code or another process is using files inside `node_modules`.
2. Node.js 24 is used (Vite’s esbuild can be flaky on very new Node).
3. Antivirus is locking or blocking the esbuild binary.

### Fix (recommended)

1. **Close Cursor** (and any other IDE/terminals using this project).
2. Open **Command Prompt** (Win + R → `cmd` → Enter).
3. Go to the project folder:
   ```bat
   cd "C:\Users\ASUS\Desktop\New RAG\RAG-based-loan-policy-check"
   ```
4. Run a clean install:
   ```bat
   node scripts/clean-install.js
   ```
   If that still hits EPERM, delete manually then install:
   ```bat
   rd /s /q node_modules
   del package-lock.json
   npm install
   ```
5. Reopen Cursor and run `npm run dev`.

### If you’re on Node.js 24

Use **Node.js 20 LTS** for best compatibility:

- Install from [nodejs.org](https://nodejs.org/) (LTS), or
- With nvm-windows: `nvm install 20` then `nvm use 20`

Then run the clean install steps above.

### If PowerShell blocks npm (execution policy)

Use Command Prompt for `npm install`, or in PowerShell (as Administrator):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
