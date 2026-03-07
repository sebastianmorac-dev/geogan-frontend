"""Query propietarios table to list existing records."""
import urllib.request
import json

# Try fetching existing animals to see what id_propietario values exist
req = urllib.request.Request("http://localhost:8000/animales/")
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    with open("test_result.txt", "w", encoding="utf-8") as f:
        f.write(f"Total animals: {len(data)}\n\n")
        propietarios = set()
        fincas = set()
        for a in data:
            propietarios.add(a.get("id_propietario"))
            fincas.add(a.get("id_finca"))
            f.write(f"id_animal={a.get('id_animal')}, id_finca={a.get('id_finca')}, id_propietario={a.get('id_propietario')}, codigo={a.get('codigo_identificacion')}\n")
        f.write(f"\nUnique id_propietario values: {sorted(propietarios)}\n")
        f.write(f"Unique id_finca values: {sorted(fincas)}\n")
    print("Done — see test_result.txt")
except Exception as ex:
    print(f"Error: {ex}")
