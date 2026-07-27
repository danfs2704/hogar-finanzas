; NSIS installer hooks for Hogar Finanzas
; This file is merged into the generated NSIS script

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Desea eliminar todos los datos de Hogar Finanzas? (base de datos y configuraciones)" /SD IDNO IDYES do_delete_data
  Goto skip_delete_data
  do_delete_data:
    RMDir /r "$APPDATA\HogarFinanzas"
  skip_delete_data:
!macroend
