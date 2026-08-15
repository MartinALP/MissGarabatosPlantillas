import win32com.client
import os
from pathlib import Path

# Build minimal xlsm like the app
import subprocess
subprocess.check_call(["node", "scripts/test_btn_inject.mjs"], cwd=r"C:\repos\missgarabatos\rubrica-evaluacion")

path = os.path.abspath(r"templates\_btn_final.xlsm")
xl = win32com.client.DispatchEx("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
try:
    wb = xl.Workbooks.Open(path)
    # Simulate sheet lookup the way the new macro does
    names = [wb.Worksheets(i).Name for i in range(1, wb.Worksheets.Count + 1)]
    print("sheets:", names)
    # Run until save dialog — cancel by not interacting; use a temp path via patching:
    # Instead, execute a tiny probe macro via Application.Run after injecting test?
    wsRep = wb.Worksheets("Reporte_Individual")
    wsAlu = wb.Worksheets("Alumnos")
    print("found via ActiveWorkbook API:", wsRep.Name, wsAlu.Name)

    # Call the public sub — GetSaveAsFilename returns False if cancelled;
    # In automation it may throw or return False. Send Esc? Use SendKeys?
    # Override: evaluate if BuscarHoja would work by running VBA inline — can't easily.
    # Just verify Run starts and hits the "no students" or save — we have students.
    out_pdf = os.path.abspath(r"templates\_test_out.pdf")
    if os.path.exists(out_pdf):
        os.remove(out_pdf)

    # Directly invoke export logic pieces with Python to confirm sheets work,
    # and Run the macro after temporarily setting a known issue:
    # Use Excel's Application.Run with a wrapper — update: call Export via Python COM same as macro
    old = wsRep.Range("C3").Value
    wsRep.Range("C3").Value = 1
    xl.Calculate()
    temp = xl.Workbooks.Add()
    wsRep.Copy(After=temp.Sheets(temp.Sheets.Count))
    # delete blank
    xl.DisplayAlerts = False
    for i in range(temp.Worksheets.Count, 0, -1):
        if not temp.Worksheets(i).Name.startswith("Reporte"):
            # copied sheet keeps name Reporte_Individual
            pass
    # Simpler: just Run and auto-dismiss save as by providing path through dialog — hard.
    # Verify macro is callable:
    try:
        # This will open GetSaveAsFilename — cancel with False by closing? 
        # On some Excel, automation GetSaveAsFilename returns False immediately.
        xl.Run("GenerarPDFTodosReportes")
        print("Run finished")
    except Exception as e:
        print("Run exception (may be dialog):", e)

    temp.Close(False)
    wsRep.Range("C3").Value = old
    wb.Close(False)
    print("OK probe")
finally:
    xl.Quit()
