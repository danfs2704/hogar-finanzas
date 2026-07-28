; NSIS installer hooks for Hogar Finanzas
; This file is merged into the generated NSIS script
; Tauri v2 supported macros: customHeader, preInstall, customInstall, customUnInstall

Var DbUseDefault
Var DbCustomPath

; --- customHeader: define functions and variables ---
!macro customHeader
  !include "nsDialogs.nsh"
  !include "FileFunc.nsh"
!macroend

; --- preInstall: show custom DB location page ---
!macro preInstall
  ; We use a simple input dialog approach
  ; Ask user: default or custom DB path
  ; Using a simple MessageBox + InputBox combo for max NSIS compatibility

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Desea elegir donde guardar la base de datos? $$
$$
Si elige NO, se usara la ubicacion predeterminada (AppData)." \
    /SD IDYES IDYES use_custom_path
  Goto use_default_path

  use_default_path:
    ; Delete any previous config so default path is used
    Delete "$APPDATA\HogarFinanzas\config.json"
    Goto db_done

  use_custom_path:
    ; Prompt for folder using NSIS's built-in folder selector
    ; We use a small loop with BrowseTextBox for directory selection

    ; Simple approach: use the system folder browser
    nsDialogs::SelectFolderDialog "Elegir ubicacion para la base de datos" ""
    Pop $0
    ${If} $0 == "error"
      Goto use_default_path
    ${EndIf}
    StrCpy $DbCustomPath $0

    ; Validate: make sure it's not empty
    StrLen $1 $DbCustomPath
    ${If} $1 == 0
      Goto use_default_path
    ${EndIf}

    ; Save the chosen path to config.json
    CreateDirectory "$APPDATA\HogarFinanzas"
    FileOpen $0 "$APPDATA\HogarFinanzas\config.json" w
    FileWrite $0 '{"dbPath":"'$DbCustomPath'"}'
    FileClose $0

  db_done:
!macroend

; --- customUnInstall: ask to delete data ---
!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Desea eliminar todos los datos de Hogar Finanzas? (base de datos y configuraciones)" \
    /SD IDNO IDYES do_delete_data
  Goto skip_delete_data
  do_delete_data:
    RMDir /r "$APPDATA\HogarFinanzas"
  skip_delete_data:
!macroend
