import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getCurrentPeriod,
  getPeriodKey,
  DAYS,
  LOCATIONS,
  PRIMARY_LOCATIONS,
  SchoolPeriod,
} from "@/types/schedule";
import {
  DAY_NAME_TO_WEEKDAY,
  WEEKDAY_TO_BG,
  Weekday,
} from "@/hooks/useUnavailability";

describe("School Period Logic", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate correct period keys", () => {
    const period: SchoolPeriod = { year: "2025/2026", term: 1 };
    expect(getPeriodKey(period)).toBe("2025/2026-term1");

    const period2: SchoolPeriod = { year: "2024/2025", term: 2 };
    expect(getPeriodKey(period2)).toBe("2024/2025-term2");
  });

  it("should return Term 1 in September (start of new school year)", () => {
    vi.useFakeTimers();
    // September 15, 2026 (month index 8)
    vi.setSystemTime(new Date(2026, 8, 15));

    const current = getCurrentPeriod();
    expect(current.year).toBe("2026/2027");
    expect(current.term).toBe(1);
  });

  it("should return Term 1 in December", () => {
    vi.useFakeTimers();
    // December 20, 2025 (month index 11)
    vi.setSystemTime(new Date(2025, 11, 20));

    const current = getCurrentPeriod();
    expect(current.year).toBe("2025/2026");
    expect(current.term).toBe(1);
  });

  it("should return Term 1 in January (still term 1 in Bulgarian schools)", () => {
    vi.useFakeTimers();
    // January 10, 2026 (month index 0)
    vi.setSystemTime(new Date(2026, 0, 10));

    const current = getCurrentPeriod();
    expect(current.year).toBe("2025/2026");
    expect(current.term).toBe(1);
  });

  it("should return Term 2 in February", () => {
    vi.useFakeTimers();
    // February 15, 2026 (month index 1)
    vi.setSystemTime(new Date(2026, 1, 15));

    const current = getCurrentPeriod();
    expect(current.year).toBe("2025/2026");
    expect(current.term).toBe(2);
  });

  it("should return Term 2 in May", () => {
    vi.useFakeTimers();
    // May 24, 2026 (month index 4)
    vi.setSystemTime(new Date(2026, 4, 24));

    const current = getCurrentPeriod();
    expect(current.year).toBe("2025/2026");
    expect(current.term).toBe(2);
  });

  it("should return Term 2 during summer break (July/August)", () => {
    vi.useFakeTimers();
    // July 15, 2026 (month index 6)
    vi.setSystemTime(new Date(2026, 6, 15));

    const current = getCurrentPeriod();
    expect(current.year).toBe("2025/2026");
    expect(current.term).toBe(2);
  });
});

describe("Schedule Constants & Days", () => {
  it("should contain standard 5 working days in Bulgarian", () => {
    expect(DAYS).toEqual([
      "Понеделник",
      "Вторник",
      "Сряда",
      "Четвъртък",
      "Петък",
    ]);
  });

  it("should have 5 predefined locations for secondary stage", () => {
    expect(LOCATIONS).toHaveLength(5);
    expect(LOCATIONS[0]).toContain("0 етаж");
    expect(LOCATIONS[1]).toContain("III-ти етаж");
    expect(LOCATIONS[2]).toContain("IV-ти етаж");
    expect(LOCATIONS[3]).toContain("Училищен стол");
    expect(LOCATIONS[4]).toContain("Главен дежурен");
  });

  it("should have 3 predefined locations for primary stage (I - IV grade)", () => {
    expect(PRIMARY_LOCATIONS).toHaveLength(3);
    expect(PRIMARY_LOCATIONS[0]).toBe("Главен дежурен параден вход - 07:00 ч.");
    expect(PRIMARY_LOCATIONS[1]).toBe("Дежурен на I етаж - 07:30 ч.");
    expect(PRIMARY_LOCATIONS[2]).toBe("Дежурен на II етаж - 07:30 ч.");
  });
});

describe("Unavailability Weekday Mapping", () => {
  it("should correctly map all Bulgarian day names to weekday identifiers", () => {
    DAYS.forEach((day) => {
      const weekday = DAY_NAME_TO_WEEKDAY[day];
      expect(weekday).toBeDefined();
      expect(WEEKDAY_TO_BG[weekday]).toBe(day);
    });
  });

  it("should correctly translate each English weekday back to Bulgarian", () => {
    const expectedMap: Record<Weekday, string> = {
      monday: "Понеделник",
      tuesday: "Вторник",
      wednesday: "Сряда",
      thursday: "Четвъртък",
      friday: "Петък",
      saturday: "Събота",
      sunday: "Неделя",
    };

    (Object.keys(expectedMap) as Weekday[]).forEach((wd) => {
      expect(WEEKDAY_TO_BG[wd]).toBe(expectedMap[wd]);
    });
  });
});

describe("Period Year Validation", () => {
  const yearPattern = /^\d{4}\/\d{4}$/;

  it("should accept valid year formats", () => {
    expect(yearPattern.test("2025/2026")).toBe(true);
    expect(yearPattern.test("2024/2025")).toBe(true);
    expect(yearPattern.test("2026/2027")).toBe(true);
  });

  it("should reject invalid year formats", () => {
    expect(yearPattern.test("2025-2026")).toBe(false);
    expect(yearPattern.test("2025/26")).toBe(false);
    expect(yearPattern.test("25/26")).toBe(false);
    expect(yearPattern.test("2025")).toBe(false);
    expect(yearPattern.test("abc/def")).toBe(false);
    expect(yearPattern.test("")).toBe(false);
  });
});

describe("Teacher Assignment Count Calculation", () => {
  it("should accurately count assignments per teacher", () => {
    const teachers = [
      { id: "t1", name: "Учител 1" },
      { id: "t2", name: "Учител 2" },
      { id: "t3", name: "Учител 3" },
    ];

    const assignments = [
      { teacherId: "t1", day: "Понеделник", location: "Дежурни на III-ти етаж" },
      { teacherId: "t1", day: "Вторник", location: "Дежурни на IV-ти етаж" },
      { teacherId: "t2", day: "Сряда", location: "Училищен стол" },
    ];

    const counts: Record<string, number> = {};
    teachers.forEach((t) => {
      counts[t.id] = 0;
    });
    assignments.forEach((a) => {
      if (counts[a.teacherId] !== undefined) {
        counts[a.teacherId]++;
      }
    });

    expect(counts["t1"]).toBe(2);
    expect(counts["t2"]).toBe(1);
    expect(counts["t3"]).toBe(0);
  });
});
