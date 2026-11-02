"""Pruebas aisladas de la regla de referencia y el árbol HU04."""

import unittest
from datetime import date

from app.domain.consistency_training import (
    FEATURES,
    build_proxy_samples,
    train_decision_tree,
)


def make_timeline():
    captures = [
        date(2026, 10, 1),
        date(2026, 10, 8),
        date(2026, 10, 15),
    ]
    publication_dates = [
        date(2026, 9, 25),  # Antigüedad corta: comienza en prioridad baja.
        date(2026, 8, 1),   # Antigüedad media: permanece en prioridad media.
        date(2026, 1, 1),   # Antigüedad alta: llega a prioridad alta tras tres capturas.
    ]
    timeline = []
    for group, publication_date in enumerate(publication_dates):
        for pet_index in range(12):
            sku = f"WUF{group * 12 + pet_index + 1:04d}"
            for run_id, capture_date in enumerate(captures, start=1):
                timeline.append({
                    "id_ejecucion": run_id,
                    "fecha_captura": capture_date,
                    "sku": sku,
                    "estado_detectado": "disponible",
                    "fecha_publicacion": publication_date,
                })
    return timeline


class ConsistencyTrainingTests(unittest.TestCase):
    def test_builds_reference_labels_and_trains_a_tree(self) -> None:
        samples = build_proxy_samples(
            make_timeline(),
            high_min_captures=3,
            high_min_age_days=180,
            medium_min_captures=2,
            medium_min_age_days=60,
            max_capture_gap_days=14,
        )

        result = train_decision_tree(
            samples, test_size=0.25, random_seed=42, max_depth=2,
        )

        self.assertEqual(len(samples), 108)
        self.assertEqual(result.train_count + result.test_count, 108)
        self.assertEqual(set(result.class_counts), {"bajo", "medio", "alto"})
        self.assertEqual(len(result.confusion), 3)
        self.assertTrue(all(len(row) == 3 for row in result.confusion))
        self.assertEqual(result.parameters["features"], FEATURES)
        self.assertTrue(result.tree_rules)
        self.assertTrue(result.tree_diagram)
        self.assertTrue(all(0 <= value <= 1 for value in result.metrics.values()))

    def test_long_gap_breaks_consecutive_capture_streak(self) -> None:
        timeline = [
            {
                "id_ejecucion": 1,
                "fecha_captura": date(2026, 10, 1),
                "sku": "WUF0001",
                "estado_detectado": "disponible",
                "fecha_publicacion": date(2026, 1, 1),
            },
            {
                "id_ejecucion": 2,
                "fecha_captura": date(2026, 10, 31),
                "sku": "WUF0001",
                "estado_detectado": "disponible",
                "fecha_publicacion": date(2026, 1, 1),
            },
        ]

        samples = build_proxy_samples(
            timeline,
            high_min_captures=3,
            high_min_age_days=180,
            medium_min_captures=2,
            medium_min_age_days=60,
            max_capture_gap_days=14,
        )

        self.assertEqual([sample["capturas_disponible"] for sample in samples], [1, 1])


if __name__ == "__main__":
    unittest.main()