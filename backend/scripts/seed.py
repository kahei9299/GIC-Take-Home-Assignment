"""Seed the database with deterministic demo data for Increment 4."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_engine
from app.models import Cafe, Employee, EmployeeAssignment
from app.shared.enums import Gender
from app.shared.validators import generate_employee_id, normalize_location


@dataclass(frozen=True)
class CafeSeed:
    """Static definition for a seeded cafe row."""

    name: str
    description: str
    location: str
    logo_url: str | None


@dataclass(frozen=True)
class EmployeeSeed:
    """Static definition for a seeded employee row."""

    name: str
    email_address: str
    phone_number: str
    gender: Gender


@dataclass(frozen=True)
class AssignmentSeed:
    """Static definition for a seeded assignment history row."""

    employee_email: str
    cafe_name: str
    start_date: date
    end_date: date | None


CAFE_SEEDS: tuple[CafeSeed, ...] = (
    CafeSeed("Bugis Brew House", "Compact commuter stop with brisk takeaway service.", "Bugis", None),
    CafeSeed("Bugis Courtyard Cafe", "All-day dining room with a shaded courtyard layout.", "Bugis", "https://example.com/logos/bugis-courtyard.png"),
    CafeSeed("Bugis Junction Roasters", "Mall-facing coffee bar focused on fast espresso service.", "Bugis", None),
    CafeSeed("Bugis Lantern Coffee", "Late-night dessert and coffee concept near the arts district.", "Bugis", "https://example.com/logos/bugis-lantern.png"),
    CafeSeed("Orchard Glasshouse", "Premium flagship outlet with brunch-heavy menu rotations.", "Orchard", "https://example.com/logos/orchard-glasshouse.png"),
    CafeSeed("Orchard Pocket Cafe", "Small-format espresso bar built for weekday office rushes.", "Orchard", None),
    CafeSeed("Orchard Terrace Kitchen", "Casual sit-down cafe with rooftop seating and pastries.", "Orchard", "https://example.com/logos/orchard-terrace.png"),
    CafeSeed("Orchard Weekend Social", "Lifestyle cafe that leans into family weekend traffic.", "Orchard", None),
    CafeSeed("Raffles Atrium Cafe", "Corporate lunch location serving high-volume weekday crowds.", "Raffles Place", "https://example.com/logos/raffles-atrium.png"),
    CafeSeed("Raffles Exchange Coffee", "Transit-adjacent kiosk with strong breakfast trade.", "Raffles Place", None),
    CafeSeed("Raffles Market Table", "Polished business district cafe with plated lunch service.", "Raffles Place", "https://example.com/logos/raffles-market.png"),
    CafeSeed("Raffles Station Espresso", "Grab-and-go service counter beside the station entrance.", "Raffles Place", None),
    CafeSeed("Tampines Community Cafe", "Neighbourhood concept serving families and students.", "Tampines", None),
    CafeSeed("Tampines East Roast", "Warm cafe with bakery case and extended evening hours.", "Tampines", "https://example.com/logos/tampines-east.png"),
    CafeSeed("Tampines Hub Kitchen", "Large-format store geared toward community events.", "Tampines", None),
    CafeSeed("Tampines Park Coffee", "Casual outlet beside the park connector trail.", "Tampines", "https://example.com/logos/tampines-park.png"),
    CafeSeed("Jurong Central Cafe", "Reliable lunch spot serving office parks in the west.", "Jurong East", None),
    CafeSeed("Jurong Lakeside Coffee", "Scenic cafe with relaxed seating and longer dwell times.", "Jurong East", "https://example.com/logos/jurong-lakeside.png"),
    CafeSeed("Jurong Platform Brew", "Transit-linked bar designed for high-throughput service.", "Jurong East", None),
    CafeSeed("Jurong Tech Yard", "Industrial-park concept with strong breakfast and lunch demand.", "Jurong East", "https://example.com/logos/jurong-techyard.png"),
    CafeSeed("Paya Lebar Commons", "Mixed-use development cafe balancing dine-in and takeaway.", "Paya Lebar", "https://example.com/logos/paya-commons.png"),
    CafeSeed("Paya Lebar Loft", "Modern mezzanine cafe with collaborative seating.", "Paya Lebar", None),
    CafeSeed("Paya Lebar Market Cafe", "Neighbourhood-forward concept with local snack pairings.", "Paya Lebar", "https://example.com/logos/paya-market.png"),
    CafeSeed("Paya Lebar Transit Cup", "Compact commuter kiosk optimized for morning throughput.", "Paya Lebar", None),
)

EMPLOYEE_SEEDS: tuple[EmployeeSeed, ...] = (
    EmployeeSeed("Alicia Tan", "alicia.tan@example.com", "81230001", Gender.FEMALE),
    EmployeeSeed("Benjamin Lee", "benjamin.lee@example.com", "81230002", Gender.MALE),
    EmployeeSeed("Cheryl Ng", "cheryl.ng@example.com", "81230003", Gender.FEMALE),
    EmployeeSeed("Daniel Goh", "daniel.goh@example.com", "81230004", Gender.MALE),
    EmployeeSeed("Evelyn Lim", "evelyn.lim@example.com", "81230005", Gender.FEMALE),
    EmployeeSeed("Farid Ahmad", "farid.ahmad@example.com", "81230006", Gender.MALE),
    EmployeeSeed("Grace Wong", "grace.wong@example.com", "81230007", Gender.FEMALE),
    EmployeeSeed("Harish Kumar", "harish.kumar@example.com", "81230008", Gender.MALE),
    EmployeeSeed("Isabelle Koh", "isabelle.koh@example.com", "81230009", Gender.FEMALE),
    EmployeeSeed("Jason Chua", "jason.chua@example.com", "81230010", Gender.MALE),
    EmployeeSeed("Kelly Toh", "kelly.toh@example.com", "81230011", Gender.FEMALE),
    EmployeeSeed("Leonard Ong", "leonard.ong@example.com", "81230012", Gender.MALE),
    EmployeeSeed("Melissa Ho", "melissa.ho@example.com", "81230013", Gender.FEMALE),
    EmployeeSeed("Nicholas Yeo", "nicholas.yeo@example.com", "81230014", Gender.MALE),
    EmployeeSeed("Olivia Teo", "olivia.teo@example.com", "81230015", Gender.FEMALE),
    EmployeeSeed("Pravin Nair", "pravin.nair@example.com", "81230016", Gender.MALE),
    EmployeeSeed("Queenie Chan", "queenie.chan@example.com", "81230017", Gender.FEMALE),
    EmployeeSeed("Ryan Seah", "ryan.seah@example.com", "81230018", Gender.MALE),
    EmployeeSeed("Samantha Low", "samantha.low@example.com", "81230019", Gender.FEMALE),
    EmployeeSeed("Terence Foo", "terence.foo@example.com", "81230020", Gender.MALE),
    EmployeeSeed("Uma Raman", "uma.raman@example.com", "91230021", Gender.FEMALE),
    EmployeeSeed("Victor Sim", "victor.sim@example.com", "91230022", Gender.MALE),
    EmployeeSeed("Wendy Liew", "wendy.liew@example.com", "91230023", Gender.FEMALE),
    EmployeeSeed("Xavier Tay", "xavier.tay@example.com", "91230024", Gender.MALE),
)

ASSIGNMENT_SEEDS: tuple[AssignmentSeed, ...] = (
    AssignmentSeed("alicia.tan@example.com", "Bugis Brew House", date(2025, 12, 1), None),
    AssignmentSeed("benjamin.lee@example.com", "Bugis Courtyard Cafe", date(2026, 1, 14), None),
    AssignmentSeed("cheryl.ng@example.com", "Orchard Glasshouse", date(2026, 2, 10), None),
    AssignmentSeed("daniel.goh@example.com", "Orchard Pocket Cafe", date(2026, 2, 21), None),
    AssignmentSeed("evelyn.lim@example.com", "Raffles Atrium Cafe", date(2026, 1, 3), None),
    AssignmentSeed("farid.ahmad@example.com", "Raffles Exchange Coffee", date(2026, 3, 1), None),
    AssignmentSeed("grace.wong@example.com", "Tampines Community Cafe", date(2026, 1, 27), None),
    AssignmentSeed("harish.kumar@example.com", "Tampines East Roast", date(2026, 3, 8), None),
    AssignmentSeed("isabelle.koh@example.com", "Jurong Central Cafe", date(2026, 2, 2), None),
    AssignmentSeed("jason.chua@example.com", "Jurong Lakeside Coffee", date(2026, 2, 28), None),
    AssignmentSeed("kelly.toh@example.com", "Paya Lebar Commons", date(2026, 1, 19), None),
    AssignmentSeed("leonard.ong@example.com", "Paya Lebar Loft", date(2026, 3, 4), None),
    AssignmentSeed("melissa.ho@example.com", "Bugis Junction Roasters", date(2025, 11, 25), None),
    AssignmentSeed("nicholas.yeo@example.com", "Orchard Terrace Kitchen", date(2026, 1, 7), None),
    AssignmentSeed("olivia.teo@example.com", "Raffles Market Table", date(2026, 2, 5), None),
    AssignmentSeed("pravin.nair@example.com", "Tampines Hub Kitchen", date(2026, 3, 12), None),
    AssignmentSeed("queenie.chan@example.com", "Jurong Platform Brew", date(2026, 1, 30), None),
    AssignmentSeed("ryan.seah@example.com", "Jurong Tech Yard", date(2026, 2, 14), None),
    AssignmentSeed("samantha.low@example.com", "Paya Lebar Market Cafe", date(2026, 3, 6), None),
    AssignmentSeed("terence.foo@example.com", "Paya Lebar Transit Cup", date(2026, 2, 25), None),
    # These closed rows create stable reassignment and unassignment history for later feature tests.
    AssignmentSeed("uma.raman@example.com", "Bugis Lantern Coffee", date(2025, 10, 1), date(2025, 12, 31)),
    AssignmentSeed("uma.raman@example.com", "Orchard Weekend Social", date(2026, 1, 5), date(2026, 2, 20)),
    AssignmentSeed("victor.sim@example.com", "Raffles Station Espresso", date(2025, 11, 3), date(2026, 1, 10)),
    AssignmentSeed("wendy.liew@example.com", "Tampines Park Coffee", date(2025, 12, 15), date(2026, 2, 28)),
    AssignmentSeed("xavier.tay@example.com", "Jurong Lakeside Coffee", date(2026, 1, 1), date(2026, 2, 18)),
    AssignmentSeed("xavier.tay@example.com", "Paya Lebar Commons", date(2026, 2, 20), date(2026, 3, 10)),
)


def create_unique_employee_id(session: Session) -> str:
    """Generate a unique employee ID, retrying until an unused value is found."""

    for _ in range(20):
        candidate = generate_employee_id()
        existing_employee = session.get(Employee, candidate)
        if existing_employee is None:
            return candidate

    raise RuntimeError("Unable to generate a unique employee ID for seed data.")


def upsert_cafes(session: Session, cafe_seeds: Iterable[CafeSeed]) -> tuple[dict[str, Cafe], dict[str, int]]:
    """Insert or update cafe rows and return them keyed by cafe name."""

    existing_cafes = {
        cafe.name: cafe
        for cafe in session.scalars(select(Cafe).where(Cafe.name.in_([seed.name for seed in cafe_seeds])))
    }
    cafe_map: dict[str, Cafe] = {}
    inserted = 0
    updated = 0

    for seed in cafe_seeds:
        cafe = existing_cafes.get(seed.name)
        if cafe is None:
            cafe = Cafe(name=seed.name)
            session.add(cafe)
            inserted += 1
        else:
            updated += 1

        cafe.description = seed.description
        cafe.logo_url = seed.logo_url
        cafe.location = seed.location
        cafe.location_normalized = normalize_location(seed.location)
        cafe_map[seed.name] = cafe

    session.flush()
    return cafe_map, {"inserted": inserted, "updated": updated}


def upsert_employees(
    session: Session,
    employee_seeds: Iterable[EmployeeSeed],
) -> tuple[dict[str, Employee], dict[str, int]]:
    """Insert or update employee rows and return them keyed by email address."""

    existing_employees = {
        employee.email_address: employee
        for employee in session.scalars(
            select(Employee).where(Employee.email_address.in_([seed.email_address for seed in employee_seeds]))
        )
    }
    employee_map: dict[str, Employee] = {}
    inserted = 0
    updated = 0

    for seed in employee_seeds:
        employee = existing_employees.get(seed.email_address)
        if employee is None:
            # Only new rows receive a generated business ID; reruns preserve the original generated value.
            employee = Employee(id=create_unique_employee_id(session), email_address=seed.email_address)
            session.add(employee)
            inserted += 1
        else:
            updated += 1

        employee.name = seed.name
        employee.phone_number = seed.phone_number
        employee.gender = seed.gender
        employee_map[seed.email_address] = employee

    session.flush()
    return employee_map, {"inserted": inserted, "updated": updated}


def upsert_assignments(
    session: Session,
    assignment_seeds: Iterable[AssignmentSeed],
    employees_by_email: dict[str, Employee],
    cafes_by_name: dict[str, Cafe],
) -> dict[str, int]:
    """Insert or update assignment history rows keyed by employee, cafe, and start date."""

    assignment_index = {
        (
            assignment.employee.email_address,
            assignment.cafe.name,
            assignment.start_date,
        ): assignment
        for assignment in session.scalars(
            select(EmployeeAssignment)
            .join(EmployeeAssignment.employee)
            .join(EmployeeAssignment.cafe)
        )
    }
    inserted = 0
    updated = 0

    for seed in assignment_seeds:
        employee = employees_by_email[seed.employee_email]
        cafe = cafes_by_name[seed.cafe_name]
        assignment_key = (seed.employee_email, seed.cafe_name, seed.start_date)
        assignment = assignment_index.get(assignment_key)

        if assignment is None:
            # History rows are matched by business identity, so new rows get a fresh UUID only once.
            assignment = EmployeeAssignment(
                employee=employee,
                cafe=cafe,
                start_date=seed.start_date,
            )
            session.add(assignment)
            assignment_index[assignment_key] = assignment
            inserted += 1
        else:
            updated += 1

        assignment.employee = employee
        assignment.cafe = cafe
        assignment.end_date = seed.end_date

    session.flush()
    return {"inserted": inserted, "updated": updated}


def seed_database(session: Session) -> dict[str, dict[str, int]]:
    """Populate the database with the Increment 4 demo dataset."""

    cafes_by_name, cafe_stats = upsert_cafes(session, CAFE_SEEDS)
    employees_by_email, employee_stats = upsert_employees(session, EMPLOYEE_SEEDS)
    assignment_stats = upsert_assignments(session, ASSIGNMENT_SEEDS, employees_by_email, cafes_by_name)

    return {
        "cafes": cafe_stats,
        "employees": employee_stats,
        "employee_assignments": assignment_stats,
    }


def print_summary(stats: dict[str, dict[str, int]]) -> None:
    """Print a short summary of inserted and updated seed rows."""

    for table_name, table_stats in stats.items():
        print(
            f"{table_name}: inserted={table_stats['inserted']} "
            f"updated={table_stats['updated']}"
        )


def main() -> None:
    """Run the Increment 4 seed script against the configured database."""

    session = SessionLocal(bind=get_engine())
    try:
        stats = seed_database(session)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    print_summary(stats)


if __name__ == "__main__":
    main()
