; NSIS installer hooks for Hogar Finanzas
; Tauri v2 supported macros: customHeader, preInstall, customInstall, customUnInstall

!macro customHeader
  !include "FileFunc.nsh"
!macroend

; After files are installed, ask user for custom DB location
!macro customInstall
  ; Skip if user already has a config (reinstall/upgrade)
  IfFileExists "$APPDATA\HogarFinanzas\config.json" db_done

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Desea elegir donde guardar la base de datos?$$\n$$\nSi elige NO, se usara la ubicacion predeterminada." \
    /SD IDNO IDNO db_done

  ; Write a PowerShell script to $PLUGINSDIR and execute it
  InitPluginsDir
  FileOpen $R0 "$PLUGINSDIR\pickfolder.ps1" w
  FileWrite $R0 "Add-Type -AssemblyName System.Windows.Forms$$\r$$\n"
  FileWrite $R0 "$$f = New-Object System.Windows.Forms.FolderBrowserDialog$$\r$$\n"
  FileWrite $R0 "$$f.Description = 'Elegir ubicacion para la base de datos'$$\r$$\n"
  FileWrite $R0 "if ($$f.ShowDialog() -eq 'OK') {$$\r$$\n"
  FileWrite $R0 "  $$d = [Environment]::GetFolderPath('ApplicationData') + '\HogarFinanzas'$$\r$$\n"
  FileWrite $R0 "  if (!(Test-Path $$d)) { New-Item -ItemType Directory -Path $$d | Out-Null }$$\r$$\n"
  FileWrite $R0 "  @{'dbPath'=$$f.SelectedPath} | ConvertTo-Json -Compress | Set-Content ($$d + '\config.json')$$\r$$\n"
  FileWrite $R0 "}$$\r$$\n"
  FileClose $R0

  nsExec::ExecToStack 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\pickfolder.ps1"'
  Pop $R0
  Pop $R1

  db_done:
!macroend

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Desea eliminar todos los datos de Hogar Finanzas? (base de datos y configuraciones)" \
    /SD IDNO IDYES do_delete_data
  Goto skip_delete_data
  do_delete_data:
    RMDir /r "$APPDATA\HogarFinanzas"
  skip_delete_data:
!macroend
