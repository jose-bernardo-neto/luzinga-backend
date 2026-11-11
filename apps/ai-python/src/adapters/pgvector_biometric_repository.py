from collections.abc import Sequence

from src.domain.errors import (
    BiometricOwnerNotFoundError,
    BiometricReferenceLimitError,
    BiometricRepositoryError,
)
from src.domain.models import MatchCandidate, NewBiometricReference


class PgVectorBiometricRepository:
    """Consulta candidatos pela média da similaridade entre todos os ângulos."""

    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def find_matches(
        self,
        embeddings: list[tuple[float, ...]],
        limit: int,
        threshold: float,
    ) -> list[MatchCandidate]:
        if not embeddings:
            return []

        try:
            import psycopg
            from pgvector import Vector
            from pgvector.psycopg import register_vector

            values = ", ".join(["(%s)"] * len(embeddings))
            query = f"""
                WITH query_embeddings(embedding) AS (
                    VALUES {values}
                ), candidate_scores AS (
                    SELECT
                        record."id",
                        record."ownerType"::text AS owner_type,
                        record."ownerId",
                        record."imagePath",
                        AVG(1 - (record."embedding" <=> query.embedding)) AS similarity
                    FROM "biometric_record" AS record
                    CROSS JOIN query_embeddings AS query
                    WHERE record."embedding" IS NOT NULL
                    GROUP BY
                        record."id",
                        record."ownerType",
                        record."ownerId",
                        record."imagePath"
                )
                SELECT "id", owner_type, "ownerId", "imagePath", similarity
                FROM candidate_scores
                WHERE similarity >= %s
                ORDER BY similarity DESC
                LIMIT %s
            """
            params: list[object] = [Vector(list(embedding)) for embedding in embeddings]
            params.extend([threshold, limit])

            with psycopg.connect(self._database_url) as connection:
                register_vector(connection)
                with connection.cursor() as cursor:
                    cursor.execute(query, params)
                    rows: Sequence[tuple[object, ...]] = cursor.fetchall()
        except Exception as exc:
            raise BiometricRepositoryError(
                "Não foi possível consultar a base biométrica."
            ) from exc

        return [
            MatchCandidate(
                biometric_record_id=str(row[0]),
                owner_type=str(row[1]),
                owner_id=str(row[2]),
                image_path=str(row[3]) if row[3] is not None else None,
                similarity=float(row[4]),
            )
            for row in rows
        ]

    def add_references(
        self,
        references: list[NewBiometricReference],
        maximum_per_owner: int,
    ) -> int:
        if not references:
            raise ValueError("Ao menos uma referência biométrica é obrigatória.")

        first = references[0]
        if any(
            item.owner_type != first.owner_type or item.owner_id != first.owner_id
            for item in references
        ):
            raise ValueError("Todas as referências devem pertencer à mesma pessoa.")

        owner_tables = {
            "MISSING_PERSON": "missing_person_report",
            "SHELTERED_PERSON": "sheltered_person",
        }
        owner_table = owner_tables.get(first.owner_type)
        if owner_table is None:
            raise ValueError("Tipo de proprietário biométrico inválido.")

        try:
            import psycopg
            from pgvector import Vector
            from pgvector.psycopg import register_vector

            with psycopg.connect(self._database_url) as connection:
                register_vector(connection)
                with connection.cursor() as cursor:
                    lock_key = f"{first.owner_type}:{first.owner_id}"
                    cursor.execute(
                        "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                        (lock_key,),
                    )
                    cursor.execute(
                        f'SELECT EXISTS(SELECT 1 FROM "{owner_table}" WHERE "id" = %s)',
                        (first.owner_id,),
                    )
                    if not cursor.fetchone()[0]:
                        raise BiometricOwnerNotFoundError(
                            "Proprietário biométrico não encontrado."
                        )

                    cursor.execute(
                        '''SELECT COUNT(*) FROM "biometric_record"
                           WHERE "ownerType" = %s AND "ownerId" = %s''',
                        (first.owner_type, first.owner_id),
                    )
                    existing = int(cursor.fetchone()[0])
                    total = existing + len(references)

                    if total > maximum_per_owner:
                        raise BiometricReferenceLimitError(
                            f"Cada pessoa pode possuir no máximo {maximum_per_owner} referências biométricas."
                        )

                    cursor.executemany(
                        '''INSERT INTO "biometric_record"
                           ("id", "ownerType", "ownerId", "imagePath", "embedding", "createdAt")
                           VALUES (%s, %s, %s, %s, %s, now())''',
                        [
                            (
                                reference.id,
                                reference.owner_type,
                                reference.owner_id,
                                reference.image_path,
                                Vector(list(reference.embedding)),
                            )
                            for reference in references
                        ],
                    )
        except (BiometricOwnerNotFoundError, BiometricReferenceLimitError):
            raise
        except Exception as exc:
            raise BiometricRepositoryError(
                "Não foi possível cadastrar as referências biométricas."
            ) from exc

        return total
