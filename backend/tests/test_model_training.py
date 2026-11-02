"""Pruebas aisladas del entrenamiento Random Forest de HU03."""

import unittest

import pandas as pd

from app.domain.model_training import (
    FEATURE_COLUMNS,
    ModelTrainingError,
    train_random_forest,
)


class RandomForestTrainingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.rows = []
        for index in range(40):
            exited = index >= 20
            self.rows.append({
                "sku": f"WUF{index + 1:04d}",
                "etiqueta_catalogo": "salio_catalogo" if exited else "permanece",
                "motivo_indeterminado": None,
                "edad_meses": None if index % 11 == 0 else (120 + index if exited else 12 + index),
                "edad_estimada": index % 3 == 0,
                "tamano_estimado": index % 5 == 0,
                "condicion_especial": index % 4 == 0,
                "orden_publicacion": index + 1,
                "especie": "gato" if index % 4 == 0 else "perro",
                "raza": "Mestizo" if index % 2 == 0 else "Poodle",
                "sexo": "H" if index % 2 == 0 else "M",
                "tipo_pelaje": "corto" if index % 3 == 0 else "medio",
                "tamano": "grande" if exited else "pequeno",
                "nivel_energia": "bajo" if exited else "alto",
            })
        self.rows.append({
            **self.rows[0],
            "sku": "WUF-INDETERMINADA",
            "etiqueta_catalogo": "indeterminada",
            "motivo_indeterminado": "evidencia ambigua",
        })

    def test_trains_and_excludes_indeterminate_rows(self) -> None:
        result = train_random_forest(
            self.rows, test_size=0.25, n_estimators=20, max_depth=5, seed=42,
        )

        self.assertEqual(result.excluded_count, 1)
        self.assertEqual(result.train_count + result.test_count, 40)
        self.assertEqual(result.class_counts, {"permanece": 20, "salio_catalogo": 20})
        self.assertEqual(result.confusion.__len__(), 2)
        self.assertEqual(len(result.confusion[0]), 2)
        self.assertTrue(result.feature_importance)
        self.assertTrue(all(0 <= value <= 1 for value in result.metrics.values()))

        probabilities = result.pipeline.predict_proba(
            pd.DataFrame(self.rows[:-1])[FEATURE_COLUMNS]
        )
        self.assertEqual(probabilities.shape, (40, 2))
        self.assertTrue(all(abs(sum(row) - 1) < 1e-9 for row in probabilities))

    def test_rejects_an_unknown_label(self) -> None:
        rows = [dict(row) for row in self.rows]
        rows[0]["etiqueta_catalogo"] = "etiqueta_desconocida"

        with self.assertRaises(ModelTrainingError):
            train_random_forest(
                rows, test_size=0.25, n_estimators=10, max_depth=3, seed=42,
            )


if __name__ == "__main__":
    unittest.main()