import win32com.client
import os
import sys

path = os.path.abspath(r"templates\_btn_final.xlsm")
xl = win32com.client.DispatchEx("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
try:
    wb = xl.Workbooks.Open(path)
    ws = wb.Worksheets("Reporte_Individual")
    print("buttons", ws.Buttons().Count)
    for i in range(1, ws.Buttons().Count + 1):
        b = ws.Buttons(i)
        print("btn OnAction=", b.OnAction)
    print("shapes", ws.Shapes.Count)
    for i in range(1, ws.Shapes.Count + 1):
        s = ws.Shapes(i)
        print("shape", s.Name, "type", s.Type)
    wb.Close(False)
    print("OK")
finally:
    xl.Quit()
