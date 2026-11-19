from sqlalchemy import CheckConstraint, ForeignKeyConstraint, UniqueConstraint

from app.models.issue import Issue
from app.models.pull_request import (
    PullRequest,
    PullRequestDependency,
    PullRequestIssueLink,
)


def _column_names(constraint: UniqueConstraint | ForeignKeyConstraint) -> tuple[str, ...]:
    return tuple(column.name for column in constraint.columns)


def test_pull_request_number_is_unique_per_project_and_queue_order_is_separate() -> None:
    constraints = PullRequest.__table__.constraints
    project_number_constraint = next(
        constraint
        for constraint in constraints
        if isinstance(constraint, UniqueConstraint)
        and _column_names(constraint) == ("project_id", "github_number")
    )

    assert project_number_constraint is not None
    assert "queue_position" in PullRequest.__table__.columns
    assert "github_number" in PullRequest.__table__.columns


def test_dependency_edges_are_unique_and_restrict_to_the_same_project() -> None:
    table = PullRequestDependency.__table__
    foreign_keys = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    ]
    project_scoped_references = {
        _column_names(constraint): tuple(element.target_fullname for element in constraint.elements)
        for constraint in foreign_keys
    }

    assert tuple(column.name for column in table.primary_key.columns) == (
        "project_id",
        "pull_request_id",
        "blocked_by_pull_request_id",
    )
    assert project_scoped_references[("project_id", "pull_request_id")] == (
        "pull_requests.project_id",
        "pull_requests.id",
    )
    assert project_scoped_references[("project_id", "blocked_by_pull_request_id")] == (
        "pull_requests.project_id",
        "pull_requests.id",
    )
    assert any(
        isinstance(constraint, CheckConstraint) and "pull_request_id !=" in str(constraint.sqltext)
        for constraint in table.constraints
    )


def test_issue_link_is_one_per_pr_and_constrained_to_the_same_project() -> None:
    table = PullRequestIssueLink.__table__
    foreign_keys = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    ]
    project_scoped_references = {
        _column_names(constraint): tuple(element.target_fullname for element in constraint.elements)
        for constraint in foreign_keys
    }

    assert tuple(column.name for column in table.primary_key.columns) == (
        "project_id",
        "pull_request_id",
    )
    assert project_scoped_references[("project_id", "pull_request_id")] == (
        "pull_requests.project_id",
        "pull_requests.id",
    )
    assert project_scoped_references[("project_id", "issue_id")] == (
        "issues.project_id",
        "issues.id",
    )
    assert any(
        isinstance(constraint, UniqueConstraint)
        and _column_names(constraint) == ("project_id", "id")
        for constraint in Issue.__table__.constraints
    )
