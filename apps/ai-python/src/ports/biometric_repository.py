from typing import Protocol

from src.domain.models import MatchCandidate, NewBiometricReference


class BiometricRepository(Protocol):
    """Porta de consulta à base de embeddings biométricos."""

    def find_matches(
        self,
        embeddings: list[tuple[float, ...]],
        limit: int,
        threshold: float,
    ) -> list[MatchCandidate]: ...

    def add_references(
        self,
        references: list[NewBiometricReference],
        maximum_per_owner: int,
    ) -> int: ...
