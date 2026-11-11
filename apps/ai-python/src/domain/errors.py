class FaceRecognitionError(Exception):
    """Erro conhecido do domínio de reconhecimento facial."""


class InvalidImageError(FaceRecognitionError):
    pass


class NoFaceDetectedError(FaceRecognitionError):
    pass


class MultipleFacesDetectedError(FaceRecognitionError):
    pass


class FaceEngineUnavailableError(FaceRecognitionError):
    pass


class BiometricRepositoryError(FaceRecognitionError):
    pass


class BiometricReferenceLimitError(FaceRecognitionError):
    pass


class BiometricOwnerNotFoundError(FaceRecognitionError):
    pass


class BiometricStorageError(FaceRecognitionError):
    pass
