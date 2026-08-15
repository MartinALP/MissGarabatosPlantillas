import zipfile
import re
import xml.etree.ElementTree as ET

path = r"c:\Users\marti\Downloads\Rubrica_Evaluacion_Kinder_A_2026-08-13 (6).xlsm"
z = zipfile.ZipFile(path)

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
}

ss = []
root = ET.fromstring(z.read("xl/sharedStrings.xml"))
for si in root.findall("main:si", NS):
    texts = [t.text or "" for t in si.findall(".//main:t", NS)]
    ss.append("".join(texts))


def cell_val(c):
    t = c.get("t")
    v = c.find("main:v", NS)
    f = c.find("main:f", NS)
    if f is not None:
        return f"FORMULA={f.text}"
    if v is None:
        return ""
    if t == "s":
        return ss[int(v.text)]
    return v.text


sheet = ET.fromstring(z.read("xl/worksheets/sheet3.xml"))
print("=== sheet3 rels ===")
print(z.read("xl/worksheets/_rels/sheet3.xml.rels").decode())
print("=== dimension/merges ===")
dim = sheet.find("main:dimension", NS)
print("dim", dim.get("ref") if dim is not None else None)
for mg in sheet.findall("main:mergeCells/main:mergeCell", NS):
    print("merge", mg.get("ref"))
print("=== cells ===")
for c in sheet.findall(".//main:c", NS):
    ref = c.get("r")
    val = cell_val(c)
    if val:
        print(f"{ref}: {val}")

print("\n=== drawing1 ===")
print(z.read("xl/drawings/drawing1.xml").decode())
print("\n=== chartEx1 ===")
print(z.read("xl/charts/chartEx1.xml").decode())
print("\n=== drawing1 rels ===")
print(z.read("xl/drawings/_rels/drawing1.xml.rels").decode())

# also peek evaluacion headers for campo columns
print("\n=== evaluacion row3/4 sample ===")
ev = ET.fromstring(z.read("xl/worksheets/sheet2.xml"))
for c in ev.findall(".//main:c", NS):
    ref = c.get("r")
    if re.match(r"^[A-Z]+[34]$", ref or ""):
        val = cell_val(c)
        if val:
            print(f"{ref}: {val}")
