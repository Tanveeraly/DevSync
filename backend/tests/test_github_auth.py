from app.services.github_auth_service import normalize_github_repository, validate_github_token


def test_normalize_github_repository_accepts_full_url() -> None:
    assert normalize_github_repository("https://github.com/owner/repository.git") == "owner/repository"


def test_normalize_github_repository_rejects_invalid_repository() -> None:
    try:
        normalize_github_repository("not-a-repository")
    except ValueError as exc:
        assert "owner/repository" in str(exc)
    else:
        raise AssertionError("Invalid repository was accepted")


def test_validate_github_token_rejects_empty_token() -> None:
    try:
        validate_github_token("   ")
    except ValueError as exc:
        assert "GitHub access token" in str(exc)
    else:
        raise AssertionError("Empty token was accepted")
