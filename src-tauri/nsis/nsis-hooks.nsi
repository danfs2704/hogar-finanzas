; NSIS installer hooks for Hogar Finanzas
; DB location is now configured from the app on first run (LoginView)

!macro customHeader
!macroend

!macro preInstall
  ; Leer el PID del proceso Node.js y matarlo
  ; Esto resuelve el problema de que el instalador cierra la app pero Node.js sigue vivo
  IfFileExists "$APPDATA\HogarFinanzas\node.pid" 0 skip_kill
    FileOpen $0 "$APPDATA\HogarFinanzas\node.pid" r
    FileRead $0 $1
    FileClose $0
    StrTrimNewLines $1 $1
    nsExec::ExecToLog 'taskkill /F /PID $1 /T'
    Delete "$APPDATA\HogarFinanzas\node.pid"
  skip_kill:
  ; Backup: matar cualquier node.exe huérfano con poca memoria
  nsExec::ExecToLog 'taskkill /F /FI "IMAGENAME eq node.exe" /FI "MEMUSAGE lt 200000" /T'
  Sleep 1000
!macroend

!macro customInstall
!macroend

!macro customUnInstall
  ; Matar Node.js antes de desinstalar
  IfFileExists "$APPDATA\HogarFinanzas\node.pid" 0 skip_kill_un
    FileOpen $0 "$APPDATA\HogarFinanzas\node.pid" r
    FileRead $0 $1
    FileClose $0
    StrTrimNewLines $1 $1
    nsExec::ExecToLog 'taskkill /F /PID $1 /T'
    Delete "$APPDATA\HogarFinanzas\node.pid"
  skip_kill_un:
  nsExec::ExecToLog 'taskkill /F /FI "IMAGENAME eq node.exe" /FI "MEMUSAGE lt 200000" /T'
  Sleep 1000

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Desea eliminar todos los datos de Hogar Finanzas? (base de datos y configuraciones)" \
    /SD IDNO IDYES do_delete_data
  Goto skip_delete_data
  do_delete_data:
    RMDir /r "$APPDATA\HogarFinanzas"
  skip_delete_data:
!macroend
