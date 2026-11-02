"""Comprueba que las exportaciones HU05 generen archivos válidos."""

import unittest
from datetime import date, datetime
from io import BytesIO

from openpyxl import load_workbook

from app.infrastructure.report_exporter import export_pdf, export_xlsx


def sample_report():
    return {
        "captura": {
            "semana": 42,
            "fecha_captura": date(2026, 10, 12),
        },
        "modelo": {"version": "1"},
        "items": [{
            "sku": "WUF0001",
            "nombre": "=NombreDePrueba",
            "especie": "perro",
            "sexo": "H",
            "edad_meses": 120,
            "edad_estimada": False,
            "tamano": "grande",
            "condicion_especial": False,
            "condicion_detalle": None,
            "orden_publicacion": 1,
            "probabilidad_adopcion": 0.25,
            "nivel_prioridad": "Alta",
        }],
        "oe3": {
            "modelo_version": "1",
            "total_desfavorecidos": 1,
            "silhouette_score": 0.35,
            "items": [{
                "sku": "WUF0001",
                "nombre": "Nombre de prueba",
                "criterios_desfavorecidos": [{"nombre": "Edad avanzada", "estimado": False}],
                "numero_segmento": 1,
                "segmento_nombre": "Segmento 1",
                "segmento_resumen": {
                    "edad_mediana_meses": 120,
                    "tamano_frecuente": "grande",
                    "energia_frecuente": "bajo",
                    "perfiles_con_atributos_desfavorecidos": 1,
                    "cantidad_perfiles": 1,
                    "porcentaje_con_atributos_desfavorecidos": 100.0,
                },
            }],
        },
    }


class ReportExporterTests(unittest.TestCase):
    def test_excel_has_separate_objective_sheets_and_safe_text(self) -> None:
        content = export_xlsx(sample_report(), datetime(2026, 11, 1, 20, 0))
        workbook = load_workbook(BytesIO(content), data_only=True)

        self.assertEqual(workbook.sheetnames, ["OE1 Priorización", "OE3 Segmentos"])
        self.assertEqual(workbook["OE1 Priorización"]["B6"].value, "'=NombreDePrueba")
        self.assertEqual(workbook["OE3 Segmentos"]["A5"].value, "WUF0001")

    def test_pdf_has_a_valid_pdf_signature(self) -> None:
        content = export_pdf(sample_report(), datetime(2026, 11, 1, 20, 0))

        self.assertTrue(content.startswith(b"%PDF-"))
        self.assertGreater(len(content), 1000)


if __name__ == "__main__":
    unittest.main()