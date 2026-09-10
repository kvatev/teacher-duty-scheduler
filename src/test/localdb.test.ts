import { describe, it, expect, beforeEach } from "vitest";
import { localDB } from "@/lib/localDB";
import { signIn } from "@/lib/auth";

describe("localDB - In-browser Database", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with default school teachers and period", () => {
    const teachers = localDB.getTeachers();
    expect(teachers.length).toBeGreaterThan(0);
    expect(teachers.some((t) => t.name.includes("Красимир Ватев"))).toBe(true);

    const periods = localDB.getPeriods();
    expect(periods.length).toBeGreaterThan(0);
    expect(periods[0].year).toContain(String(new Date().getFullYear()));
  });

  it("supports adding and removing teachers", () => {
    const newTeacher = localDB.addTeacher("Иван Петров");
    expect(newTeacher).not.toBeNull();
    expect(newTeacher?.name).toBe("Иван Петров");

    const teachers = localDB.getTeachers();
    expect(teachers.some((t) => t.id === newTeacher?.id)).toBe(true);

    if (newTeacher) {
      localDB.removeTeacher(newTeacher.id);
      expect(localDB.getTeachers().some((t) => t.id === newTeacher.id)).toBe(false);
    }
  });

  it("saves and retrieves assignments for a period", () => {
    const periods = localDB.getPeriods();
    const periodId = periods[0].id;
    const teachers = localDB.getTeachers();

    const sampleAssignments = [
      {
        day: "Понеделник",
        location: "1 етаж",
        teacherId: teachers[0].id,
        shiftNumber: 1,
        periodId,
      },
      {
        day: "Вторник",
        location: "4 етаж",
        teacherId: teachers[1].id,
        shiftNumber: 2,
        periodId,
      },
    ];

    localDB.saveAssignments(periodId, sampleAssignments);
    const retrieved = localDB.getAssignments(periodId);
    expect(retrieved.length).toBe(2);
    expect(retrieved[0].teacherId).toBe(teachers[0].id);
    expect(retrieved[1].shiftNumber).toBe(2);
  });

  it("manages unavailability notes correctly", () => {
    const teachers = localDB.getTeachers();

    const unavail = localDB.addWeekdayUnavailability(teachers[0].id, "tuesday", "Свободен ден");

    expect(unavail.id).toBeDefined();
    const list = localDB.getUnavailabilities(teachers[0].id);
    expect(list.length).toBe(1);
    expect(list[0].note).toBe("Свободен ден");

    localDB.removeUnavailability(unavail.id);
    expect(localDB.getUnavailabilities(teachers[0].id).length).toBe(0);
  });

  it("supports adding and deleting broadcasts", () => {
    const b = localDB.addBroadcast("Тестово важно съобщение", "urgent");
    expect(b.message).toBe("Тестово важно съобщение");
    expect(b.priority).toBe("urgent");

    const broadcasts = localDB.getBroadcasts();
    expect(broadcasts.some((item) => item.id === b.id)).toBe(true);

    localDB.deleteBroadcast(b.id);
    expect(localDB.getBroadcasts().some((item) => item.id === b.id)).toBe(false);
  });

  it("authenticates admin with secured credentials and allows updates", async () => {
    // Check configured admin password
    const validDefault = await localDB.checkAdminPassword("P@ssword123!");
    expect(validDefault).toBe(true);

    const wrong = await localDB.checkAdminPassword("wrongpass");
    expect(wrong).toBe(false);

    const oldAdminFails = await localDB.checkAdminPassword("admin");
    expect(oldAdminFails).toBe(false);

    // Update password
    await localDB.setAdminPassword("newsecret123");
    const oldFails = await localDB.checkAdminPassword("P@ssword123!");
    expect(oldFails).toBe(false);

    const newWorks = await localDB.checkAdminPassword("newsecret123");
    expect(newWorks).toBe(true);
  });

  it("exports and imports database backups seamlessly", () => {
    localDB.addTeacher("Експорт Тест");

    const backup = localDB.exportBackup();
    expect(backup.teachers.some((t) => t.name === "Експорт Тест")).toBe(true);
    expect(backup.periods.length).toBeGreaterThan(0);

    // Clear and restore
    localStorage.clear();
    const restored = localDB.importBackup(backup);
    expect(restored).toBe(true);
    expect(localDB.getTeachers().some((t) => t.name === "Експорт Тест")).toBe(true);
  });

  it("resets to initial school defaults", () => {
    localDB.addTeacher("Временен учител");
    expect(localDB.getTeachers().some((t) => t.name === "Временен учител")).toBe(true);

    localDB.resetToDefaults();
    expect(localDB.getTeachers().some((t) => t.name === "Временен учител")).toBe(false);
    expect(localDB.getTeachers().some((t) => t.name.includes("Красимир Ватев"))).toBe(true);
  });

  it("authenticates via signIn with user 'admin' and secured password", async () => {
    // Valid login
    const resSuccess = await signIn("admin", "P@ssword123!");
    expect(resSuccess.error).toBeNull();
    expect(localDB.getAdminSession()).toBe(true);

    // Cyrillic keyboard support
    const resCyrillic = await signIn("админ", "P@ssword123!");
    expect(resCyrillic.error).toBeNull();

    // With leading/trailing whitespace
    const resWhitespace = await signIn("  admin  ", "P@ssword123!");
    expect(resWhitespace.error).toBeNull();

    // Wrong username
    const resBadUser = await signIn("wronguser", "P@ssword123!");
    expect(resBadUser.error).toBe("Грешно потребителско име или парола");

    // Wrong password
    const resBadPass = await signIn("admin", "wrongpassword");
    expect(resBadPass.error).toBe("Грешно потребителско име или парола");

    // Old password
    const resOldPass = await signIn("admin", "admin");
    expect(resOldPass.error).toBe("Грешно потребителско име или парола");
  });

  it("automatically purges legacy auth cache from localStorage and allows P@ssword123!", async () => {
    // Simulate user having the old schema / old "admin" hash in their browser's localStorage
    localStorage.setItem(
      "teacher_duty_auth",
      JSON.stringify({ hash: "c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd4" })
    );

    // Calling checkAdminPassword with P@ssword123! should purge the legacy hash and succeed
    const isValid = await localDB.checkAdminPassword("P@ssword123!");
    expect(isValid).toBe(true);

    // signIn should also succeed immediately
    const loginRes = await signIn("admin", "P@ssword123!");
    expect(loginRes.error).toBeNull();
    expect(localDB.getAdminSession()).toBe(true);
  });
});

