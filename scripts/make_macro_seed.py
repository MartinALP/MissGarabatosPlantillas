"""Crea templates/macro_seed.xlsm y extrae vbaProject.bin (requiere Excel + AccessVBOM)."""
import os
import sys
import zipfile
import shutil

try:
    import win32com.client
except ImportError:
    print("pip install pywin32")
    sys.exit(1)

MOD_CODE = r'''
Option Explicit

Public Sub Auto_Open()
    On Error Resume Next
    Application.OnTime Now + TimeSerial(0, 0, 1), "AsegurarBotonPDF"
End Sub

Private Function LibroDeTrabajo() As Workbook
    On Error Resume Next
    Set LibroDeTrabajo = Application.ActiveWorkbook
    If LibroDeTrabajo Is Nothing Then Set LibroDeTrabajo = ThisWorkbook
    On Error GoTo 0
End Function

Private Function BuscarHoja(wb As Workbook, ByVal nombre As String) As Worksheet
    Dim ws As Worksheet
    Dim s As Object
    On Error Resume Next
    Set BuscarHoja = wb.Worksheets(nombre)
    If Not BuscarHoja Is Nothing Then Exit Function

    For Each ws In wb.Worksheets
        If StrComp(Trim$(ws.Name), Trim$(nombre), vbTextCompare) = 0 Then
            Set BuscarHoja = ws
            Exit Function
        End If
    Next ws

    Set s = wb.Sheets(nombre)
    If TypeName(s) = "Worksheet" Then Set BuscarHoja = s
    On Error GoTo 0
End Function

Public Sub AsegurarBotonPDF()
    Dim wb As Workbook
    Dim ws As Worksheet
    Dim leftPos As Double, topPos As Double, w As Double, h As Double
    Dim shp As Shape

    On Error Resume Next
    Set wb = LibroDeTrabajo()
    If wb Is Nothing Then Exit Sub
    Set ws = BuscarHoja(wb, "Reporte_Individual")
    If ws Is Nothing Then Exit Sub

    ws.Shapes("btnPDFTodos").Delete
    ws.Buttons("btnPDFTodos").Delete
    On Error GoTo 0

    leftPos = ws.Range("H2").Left + 2
    topPos = ws.Range("H2").Top + 2
    w = ws.Range("H2:J3").Width - 4
    h = ws.Range("H2:J3").Height - 4
    If w < 160 Then w = 200
    If h < 36 Then h = 42

    ' Botón visual (como agendas escolares): forma redondeada, no Form Control gris
    On Error Resume Next
    Set shp = ws.Shapes.AddShape(5, leftPos, topPos, w, h) ' msoShapeRoundedRectangle
    On Error GoTo 0
    If shp Is Nothing Then Exit Sub

    With shp
        .Name = "btnPDFTodos"
        .OnAction = "ModPDF.GenerarPDFTodosReportes"
        On Error Resume Next
        .Adjustments.Item(1) = 0.25
        On Error GoTo 0

        .Fill.Visible = msoTrue
        .Fill.Solid
        .Fill.ForeColor.RGB = RGB(39, 174, 96) ' #27AE60
        .Line.Visible = msoTrue
        .Line.ForeColor.RGB = RGB(30, 132, 73) ' #1E8449
        .Line.Weight = 1.5

        On Error Resume Next
        .Shadow.Visible = msoTrue
        .Shadow.Type = msoShadow21
        .Shadow.Transparency = 0.55
        On Error GoTo 0

        With .TextFrame
            .Characters.Text = "PDF  ·  TODOS LOS ALUMNOS"
            .Characters.Font.Name = "Calibri"
            .Characters.Font.Bold = True
            .Characters.Font.Size = 12
            .Characters.Font.Color = RGB(255, 255, 255)
            .HorizontalAlignment = xlHAlignCenter
            .VerticalAlignment = xlVAlignCenter
            .MarginLeft = 6
            .MarginRight = 6
            .MarginTop = 2
            .MarginBottom = 2
        End With
    End With
End Sub

Public Sub GenerarPDFTodosReportes()
    Dim wb As Workbook
    Dim wsRep As Worksheet
    Dim wsAlu As Worksheet
    Dim i As Long, n As Long, k As Long
    Dim alumnos(1 To 30) As Long
    Dim ruta As Variant
    Dim oldNum As Variant
    Dim tempWb As Workbook
    Dim wsNew As Worksheet
    Dim sh As Worksheet
    Dim msg As String
    Dim listaHojas As String

    On Error GoTo CleanFail

    ' Por si abrieron el archivo sin Auto_Open
    On Error Resume Next
    AsegurarBotonPDF
    On Error GoTo CleanFail

    Set wb = LibroDeTrabajo()
    If wb Is Nothing Then
        MsgBox "No se pudo identificar el libro de Excel.", vbExclamation, "Miss Garabatos"
        Exit Sub
    End If

    Set wsRep = BuscarHoja(wb, "Reporte_Individual")
    Set wsAlu = BuscarHoja(wb, "Alumnos")

    If wsRep Is Nothing Or wsAlu Is Nothing Then
        listaHojas = ""
        For Each sh In wb.Worksheets
            listaHojas = listaHojas & " • " & sh.Name & vbCrLf
        Next sh
        MsgBox "No encontré Alumnos / Reporte_Individual en este libro." & vbCrLf & vbCrLf & _
               "Libro: " & wb.Name & vbCrLf & _
               "Hojas:" & vbCrLf & listaHojas, vbExclamation, "Miss Garabatos"
        Exit Sub
    End If

    n = 0
    For i = 1 To 30
        If Len(Trim$(CStr(wsAlu.Cells(4 + i, 2).Value & ""))) > 0 Or _
           Len(Trim$(CStr(wsAlu.Cells(4 + i, 4).Value & ""))) > 0 Then
            n = n + 1
            alumnos(n) = i
        End If
    Next i

    If n = 0 Then
        MsgBox "No hay alumnos con Apellidos o Nombre en la hoja Alumnos.", vbExclamation, "Miss Garabatos"
        Exit Sub
    End If

    ruta = Application.GetSaveAsFilename( _
        InitialFileName:=Environ$("USERPROFILE") & "\Documents\Reportes_Todos_" & Format(Date, "yyyymmdd") & ".pdf", _
        FileFilter:="PDF (*.pdf), *.pdf", _
        Title:="Guardar PDF de todos los reportes")
    If ruta = False Then Exit Sub

    oldNum = wsRep.Range("D4").Value
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False

    Set tempWb = Workbooks.Add(xlWBATWorksheet)

    For k = 1 To n
        wsRep.Range("D4").Value = alumnos(k)
        Application.Calculate
        DoEvents

        wsRep.Copy After:=tempWb.Sheets(tempWb.Sheets.Count)
        Set wsNew = tempWb.Sheets(tempWb.Sheets.Count)
        On Error Resume Next
        wsNew.Name = "Alumno_" & Format$(alumnos(k), "00")
        On Error GoTo CleanFail

        wsNew.UsedRange.Value = wsNew.UsedRange.Value
    Next k

    For Each sh In tempWb.Worksheets
        If Left$(sh.Name, 7) <> "Alumno_" Then
            sh.Delete
        End If
    Next sh

    tempWb.ExportAsFixedFormat _
        Type:=xlTypePDF, _
        Filename:=CStr(ruta), _
        Quality:=xlQualityStandard, _
        IncludeDocProperties:=True, _
        IgnorePrintAreas:=False, _
        OpenAfterPublish:=True

    tempWb.Close SaveChanges:=False
    Set tempWb = Nothing

    wsRep.Range("D4").Value = oldNum
    Application.EnableEvents = True
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True

    MsgBox "Listo: PDF con " & n & " reporte(s)." & vbCrLf & CStr(ruta), vbInformation, "Miss Garabatos"
    Exit Sub

CleanFail:
    msg = Err.Description
    If Len(msg) = 0 Then msg = "Error desconocido (" & CStr(Err.Number) & ")"
    On Error Resume Next
    If Not tempWb Is Nothing Then tempWb.Close SaveChanges:=False
    If Not wsRep Is Nothing Then wsRep.Range("D4").Value = oldNum
    Application.EnableEvents = True
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    MsgBox "No se pudo generar el PDF:" & vbCrLf & msg, vbCritical, "Miss Garabatos"
End Sub
'''


def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out_dir = os.path.join(root, "templates")
    assets = os.path.join(root, "src", "excel", "assets")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(assets, exist_ok=True)
    out = os.path.join(out_dir, "macro_seed.xlsm")
    bin_out = os.path.join(assets, "vbaProject.bin")

    xl = win32com.client.Dispatch("Excel.Application")
    xl.Visible = False
    xl.DisplayAlerts = False
    try:
        wb = xl.Workbooks.Add()
        vbcomp = wb.VBProject.VBComponents.Add(1)
        vbcomp.Name = "ModPDF"
        vbcomp.CodeModule.AddFromString(MOD_CODE)
        wb.SaveAs(out, FileFormat=52)
        wb.Close(False)
        print("OK seed", out)
    finally:
        xl.Quit()

    with zipfile.ZipFile(out, "r") as z:
        with z.open("xl/vbaProject.bin") as src, open(bin_out, "wb") as dst:
            shutil.copyfileobj(src, dst)
    print("OK bin", bin_out, "size", os.path.getsize(bin_out))


if __name__ == "__main__":
    main()
