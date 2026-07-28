; NSIS installer hooks for Hogar Finanzas
; Tauri v2 supported macros: customHeader, preInstall, customInstall, customUnInstall

Var DbCustomPath

!macro customHeader
  !include "FileFunc.nsh"
!macroend

; Show DB location choice after files are installed
!macro customInstall
  ; Check if user already has a config (reinstall)
  IfFileExists "$APPDATA\HogarFinanzas\config.json" db_skip_prompt

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Desea elegir donde guardar la base de datos?$\n$\nSi elige NO, se usara la ubicacion predeterminada." \
    /SD IDNO IDNO db_skip_prompt

  ; Ask for custom path using Windows API
  ; BIF_RETURNONLYFSDIRS = 1, BIF_NEWDIALOGSTYLE = 0x40
  System::Call '*(t "", t "Elegir ubicacion para la base de datos", i 0x41, i 0) p .r0'
  System::Call 'shell32::SHBrowseForFolder(p r0) p .r1'
  ${If} $1 != "0"
    System::Call '*$1(t, t, p, p) i .r2'
    ; Get path from PIDL
    System::Call 'shlwapi::SHGetPathFromIDList(p r1, t .r3) i .r4'
    ${If} $4 != "0"
      StrCpy $DbCustomPath $3
      CreateDirectory "$APPDATA\HogarFinanzas"
      FileOpen $0 "$APPDATA\HogarFinanzas\config.json" w
      FileWrite $0 '{"dbPath":"'$DbCustomPath'"}'
      FileClose $0
    ${EndIf}
    System::Call 'ole32::CoTaskMemFree(p r1)'
  ${EndIf}
  System::Free $0

  db_skip_prompt:
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
