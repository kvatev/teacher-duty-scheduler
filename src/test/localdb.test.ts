import { describe, it, expect, beforeEach, vi } from "vitest";
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

  it("clears all assignments for a given period without removing teachers", () => {
    const periods = localDB.getPeriods();
    const periodId = periods[0].id;
    const teachers = localDB.getTeachers(periodId);
    expect(teachers.length).toBeGreaterThan(0);

    // Assign some teachers
    localDB.assignTeacher(periodId, teachers[0].id, "Понеделник", "1 етаж", 1);
    if (teachers[1]) {
      localDB.assignTeacher(periodId, teachers[1].id, "Вторник", "2 етаж", null);
    }
    expect(localDB.getAssignments(periodId).length).toBeGreaterThan(0);

    // Clear schedule for this period
    localDB.clearAssignmentsForPeriod(periodId);

    // Assignments should be empty
    expect(localDB.getAssignments(periodId).length).toBe(0);

    // Teachers must remain completely intact
    const teachersAfter = localDB.getTeachers(periodId);
    expect(teachersAfter.length).toBe(teachers.length);
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

  it("separates primary stage teachers and assignments from secondary stage", () => {
    const periods = localDB.getPeriods();
    const periodId = periods[0].id;

    // Secondary teachers exist by default
    const secTeachers = localDB.getTeachers(periodId, "secondary");
    expect(secTeachers.length).toBeGreaterThan(0);

    // Primary teachers start empty
    const initialPrimaryTeachers = localDB.getTeachers(periodId, "primary");
    expect(initialPrimaryTeachers.length).toBe(0);

    // Add primary teacher
    const primaryTeacher = localDB.addTeacher("Мария Иванова - начален учител", periodId, "primary");
    expect(primaryTeacher).not.toBeNull();
    expect(primaryTeacher?.stage).toBe("primary");

    // Primary list has 1, secondary list remains unchanged
    const afterPrimaryTeachers = localDB.getTeachers(periodId, "primary");
    expect(afterPrimaryTeachers.length).toBe(1);
    expect(afterPrimaryTeachers[0].name).toBe("Мария Иванова - начален учител");

    const afterSecTeachers = localDB.getTeachers(periodId, "secondary");
    expect(afterSecTeachers.length).toBe(secTeachers.length);
    expect(afterSecTeachers.some((t) => t.id === primaryTeacher?.id)).toBe(false);

    const initialSecAssignmentsCount = localDB.getAssignments(periodId, "secondary").length;

    // Assign primary teacher to a primary location
    localDB.assignTeacher(periodId, primaryTeacher!.id, "Понеделник", "Главен дежурен параден вход - 07:00 ч.", null, "primary");
    // Assign secondary teacher to secondary location
    localDB.assignTeacher(periodId, secTeachers[0].id, "Вторник", "Дежурни на III-ти етаж", 1, "secondary");

    const primaryAssignments = localDB.getAssignments(periodId, "primary");
    const secAssignments = localDB.getAssignments(periodId, "secondary");

    expect(primaryAssignments.length).toBe(1);
    expect(primaryAssignments[0].teacherId).toBe(primaryTeacher!.id);
    expect(primaryAssignments[0].location).toBe("Главен дежурен параден вход - 07:00 ч.");

    expect(secAssignments.length).toBe(initialSecAssignmentsCount + 1);
    expect(secAssignments.some((a) => a.teacherId === secTeachers[0].id)).toBe(true);

    // Clearing primary assignments leaves secondary intact
    localDB.clearAssignmentsForPeriod(periodId, "primary");
    expect(localDB.getAssignments(periodId, "primary").length).toBe(0);
    expect(localDB.getAssignments(periodId, "secondary").length).toBe(initialSecAssignmentsCount + 1);
  });

  it("provides primary stage default settings and locations", () => {
    const settings = localDB.getSettings();
    expect(settings.primary_location_1).toBe("Главен дежурен параден вход - 07:00 ч.");
    expect(settings.primary_location_2).toBe("Дежурен на I етаж - 07:30 ч.");
    expect(settings.primary_location_3).toBe("Дежурен на II етаж - 07:30 ч.");
    expect(settings.location_5).toBe("Дежурен на 0 етаж");
    expect(settings.pdf_schedule_description_primary).toContain("начален етап");
  });

  it("supports assigning and updating duty allocation notes (e.g. фоайе)", () => {
    const periods = localDB.getPeriods();
    const periodId = periods[0].id;
    const teachers = localDB.getTeachers(periodId, "secondary");
    const teacher = teachers[0];

    const location = "Училищен стол и пред кабинет по музика";
    const day = "Сряда";

    // Assign teacher with note 'фоайе'
    const assigned = localDB.assignTeacher(periodId, teacher.id, day, location, null, "secondary", "фоайе");
    expect(assigned).toBe(true);

    const assignments = localDB.getAssignments(periodId, "secondary");
    const found = assignments.find((a) => a.teacherId === teacher.id && a.day === day && a.location === location);
    expect(found).toBeDefined();
    expect(found?.note).toBe("фоайе");

    // Update note to 'стол'
    localDB.updateAssignmentNote(periodId, teacher.id, day, location, "стол");
    const updated = localDB.getAssignments(periodId, "secondary").find((a) => a.teacherId === teacher.id && a.day === day && a.location === location);
    expect(updated?.note).toBe("стол");

    // Move teacher to another day and ensure note is preserved
    localDB.moveTeacher(periodId, teacher.id, day, location, "Четвъртък", location);
    const moved = localDB.getAssignments(periodId, "secondary").find((a) => a.teacherId === teacher.id && a.day === "Четвъртък" && a.location === location);
    expect(moved?.note).toBe("стол");
  });

  it("supports shift values '1', '2', and '1,2' (or '1, 2') at shift location", () => {
    const periods = localDB.getPeriods();
    const periodId = periods[0].id;
    const teachers = localDB.getTeachers(periodId, "secondary");
    const teacher = teachers[0];

    const shiftLocation = "Главен дежурен – западен вход 07:30-08:40 ч.";
    const day = "Понеделник";

    // Assign with shift '1,2'
    localDB.assignTeacher(periodId, teacher.id, day, shiftLocation, "1,2", "secondary");
    const found = localDB.getAssignments(periodId, "secondary").find((a) => a.teacherId === teacher.id && a.day === day && a.location === shiftLocation);
    expect(found?.shiftNumber).toBe("1,2");

    // Update shift to '1, 2'
    localDB.updateShiftNumber(periodId, teacher.id, day, shiftLocation, "1, 2");
    const updated = localDB.getAssignments(periodId, "secondary").find((a) => a.teacherId === teacher.id && a.day === day && a.location === shiftLocation);
    expect(updated?.shiftNumber).toBe("1, 2");

    // Update shift to '1'
    localDB.updateShiftNumber(periodId, teacher.id, day, shiftLocation, "1");
    const updated1 = localDB.getAssignments(periodId, "secondary").find((a) => a.teacherId === teacher.id && a.day === day && a.location === shiftLocation);
    expect(updated1?.shiftNumber).toBe("1");
  });

  it("initializes with all 45 default teachers and 79 official assignments for secondary stage", () => {
    const teachers = localDB.getTeachers(undefined, "secondary");
    expect(teachers.length).toBe(45);

    // Verify all names are unique
    const names = teachers.map((t) => t.name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(45);

    // Check specific teachers from user request and official schedule image
    expect(teachers.some((t) => t.name === "Албена Гарабедян")).toBe(true);
    expect(teachers.some((t) => t.name === "Янчо Желев")).toBe(true);
    expect(teachers.some((t) => t.name === "Надя Калъбалъкова")).toBe(true);
    expect(teachers.some((t) => t.name === "Мария Златева")).toBe(true);
    expect(teachers.some((t) => t.name === "Павлина Пеперова")).toBe(true);
    expect(teachers.some((t) => t.name === "Екатерина Зафирова")).toBe(true);
    // Ensure old typo is not present
    expect(teachers.some((t) => t.name === "Надя Калъбалкова")).toBe(false);

    // Check assignments
    const assignments = localDB.getAssignments(undefined, "secondary");
    expect(assignments.length).toBe(79);
  });

  it("syncDefaultTeachers() migrates old spelling and expands existing storage to 45 without duplicates", () => {
    // Simulate an existing database that had only 3 old teachers including the typo
    const periods = localDB.getPeriods();
    const periodId = periods[0].id;

    const oldTeachers = [
      { id: "old-1", name: "Красимир Ватев", periodId, stage: "secondary" },
      { id: "old-2", name: "Надя Калъбалкова", periodId, stage: "secondary" },
      { id: "old-3", name: "Десислава Димитрова", periodId, stage: "secondary" },
    ];
    localStorage.setItem("teacher_scheduler_teachers", JSON.stringify(oldTeachers));

    // Also add an assignment pointing to the old typo teacher
    const oldAssignment = {
      id: "a-1",
      teacherId: "old-2",
      day: "Понеделник",
      location: "Дежурни на III-ти етаж",
      periodId,
      stage: "secondary",
    };
    localStorage.setItem("teacher_scheduler_assignments", JSON.stringify([oldAssignment]));

    // Run sync
    localDB.syncDefaultTeachers();

    const syncedTeachers = localDB.getTeachers(periodId, "secondary");
    expect(syncedTeachers.length).toBe(45);

    // Name must be normalized to 'Надя Калъбалъкова'
    const nadia = syncedTeachers.find((t) => t.name === "Надя Калъбалъкова");
    expect(nadia).toBeDefined();
    expect(nadia?.id).toBe("old-2");

    // Old typo must be gone
    expect(syncedTeachers.some((t) => t.name === "Надя Калъбалкова")).toBe(false);

    // Assignment must still exist for Nadia
    const assignments = localDB.getAssignments(periodId, "secondary");
    expect(assignments.some((a) => a.teacherId === "old-2")).toBe(true);

    // Running sync again must be idempotent and not create duplicate teachers
    localDB.syncDefaultTeachers();
    expect(localDB.getTeachers(periodId, "secondary").length).toBe(45);
  });

  it("syncDefaultTeachers() deduplicates teachers if any duplicates exist in storage and retains assignments", () => {
    const periods = localDB.getPeriods();
    const periodId = periods[0].id;

    // Simulate duplicate entries for 'Красимир Ватев'
    const duplicateTeachers = [
      { id: "kv-1", name: "Красимир Ватев", periodId, stage: "secondary" },
      { id: "kv-2", name: "красимир ватев ", periodId, stage: "secondary" },
      { id: "ab-1", name: "Албена Гарабедян", periodId, stage: "secondary" },
    ];
    localStorage.setItem("teacher_scheduler_teachers", JSON.stringify(duplicateTeachers));

    // Assignment pointing to duplicate 'kv-2'
    const assignment = {
      id: "as-dup",
      teacherId: "kv-2",
      day: "Вторник",
      location: "Дежурни на IV-ти етаж",
      periodId,
      stage: "secondary",
    };
    localStorage.setItem("teacher_scheduler_assignments", JSON.stringify([assignment]));

    localDB.syncDefaultTeachers();

    const teachers = localDB.getTeachers(periodId, "secondary");
    expect(teachers.length).toBe(45);

    // Must have only 1 'Красимир Ватев'
    const kvMatches = teachers.filter((t) => t.name.trim().toLowerCase() === "красимир ватев");
    expect(kvMatches.length).toBe(1);
    expect(kvMatches[0].id).toBe("kv-1");

    // Assignment remapped to surviving ID 'kv-1'
    const remappedAssignment = localDB.getAssignments(periodId, "secondary").find((a) => a.id === "as-dup");
    expect(remappedAssignment?.teacherId).toBe("kv-1");
  });

  it("syncFromPublishedSchedule() downloads and applies published central schedule from GitHub", async () => {
    const mockPublishedData = {
      version: 1,
      exportedAt: "2026-09-14T14:30:00.000Z",
      periods: [{ id: "github-p1", year: "2026/2027", term: 1 }],
      teachers: [
        { id: "gt-1", name: "Красимир Ватев", periodId: "github-p1", stage: "secondary" },
        { id: "gt-2", name: "Албена Гарабедян", periodId: "github-p1", stage: "secondary" },
      ],
      assignments: [
        { id: "ga-1", teacherId: "gt-1", day: "Сряда", location: "Дежурни на III-ти етаж", periodId: "github-p1", stage: "secondary" },
      ],
      unavailability: [],
      settings: {
        header_title: "Актуален график от GitHub",
      },
      broadcasts: [],
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPublishedData,
    } as unknown as Response);

    try {
      const synced = await localDB.syncFromPublishedSchedule();
      expect(synced).toBe(true);

      const periods = localDB.getPeriods();
      expect(periods.some((p) => p.id === "github-p1")).toBe(true);

      const assignments = localDB.getAssignments("github-p1", "secondary");
      expect(assignments.length).toBe(1);
      expect(assignments[0].teacherId).toBe("gt-1");

      const settings = localDB.getSettings();
      expect(settings.header_title).toBe("Актуален график от GitHub");
      expect(localDB.getLastPublishedSync()).toBe("2026-09-14T14:30:00.000Z");

      // Next call with same timestamp without force should return false
      const reSync = await localDB.syncFromPublishedSchedule(false);
      expect(reSync).toBe(false);

      // Force call should return true
      const forceSync = await localDB.syncFromPublishedSchedule(true);
      expect(forceSync).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("publishToCloud() successfully sends schedule data to /api/schedule", async () => {
    const originalFetch = global.fetch;
    const mockPostResponse = {
      ok: true,
      json: async () => ({
        success: true,
        storageType: "Upstash Redis / Vercel KV",
        message: "Графикът е записан успешно!",
      }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockPostResponse as unknown as Response);

    try {
      const result = await localDB.publishToCloud();
      expect(result.success).toBe(true);
      expect(result.storageType).toBe("Upstash Redis / Vercel KV");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/schedule",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      );
      expect(localDB.getLastPublishedSync()).toBe(result.exportedAt);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("checkCloudStatus() queries /api/schedule?status=1", async () => {
    const originalFetch = global.fetch;
    const mockStatusResponse = {
      ok: true,
      json: async () => ({
        connected: true,
        activeStorage: "Vercel Blob",
      }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockStatusResponse as unknown as Response);

    try {
      const status = await localDB.checkCloudStatus();
      expect(status.connected).toBe(true);
      expect(status.activeStorage).toBe("Vercel Blob");
    } finally {
      global.fetch = originalFetch;
    }
  });
});



