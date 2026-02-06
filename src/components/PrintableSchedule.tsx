import React, { forwardRef } from "react";
import { DAYS, LOCATIONS, Teacher, SchoolPeriod } from "@/types/schedule";
import logoImage from "@/assets/su-konstantin-petkanов-logo.png";

interface PrintableScheduleProps {
  getAssignmentsForCell: (day: string, location: string) => Teacher[];
  currentPeriod: SchoolPeriod;
}

export const PrintableSchedule = forwardRef<HTMLDivElement, PrintableScheduleProps>(
  ({ getAssignmentsForCell, currentPeriod }, ref) => {
    if (!currentPeriod) {
      return null;
    }
    
    const termText = currentPeriod.term === 1 ? "I учебен срок" : "II учебен срок";
    const yearText = `${currentPeriod.year} учебна година`;

    return (
      <div
        ref={ref}
        className="bg-white p-8 text-black"
        style={{ 
          fontFamily: "Arial, sans-serif",
          width: "1200px",
          minHeight: "800px"
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <img src={logoImage} alt="Лого" className="w-16 h-16 object-contain" />
          <div className="text-center flex-1 px-4">
            <h1 className="text-xl font-bold mb-1">СУ „КОНСТАНТИН ПЕТКАНОВ" – БУРГАС</h1>
            <p className="text-sm">гр. Бургас тел: 0876335444; тел:852-709; 854-704</p>
            <p className="text-sm">ж.к. „Меден рудник" e-mail: info-200232@edu.mon.bg</p>
            <div className="border-b-2 border-black mt-2 mx-auto w-3/4"></div>
          </div>
          <img src={logoImage} alt="Лого" className="w-16 h-16 object-contain" />
        </div>

        {/* Approval Section */}
        <div className="mb-4 mt-6">
          <p className="font-bold">УТВЪРЖДАВАМ:</p>
          <p className="font-bold">ИВАЙЛО МАРКОВ</p>
          <p className="font-bold">ДИРЕКТОР</p>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">ГРАФИК</h2>
          <p className="text-sm">
            за дежурство на учителите от прогимназиален и гимназиален етап {termText}, {yearText}
          </p>
        </div>

        {/* Schedule Table */}
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left font-bold w-24">
                Ден от седмицата
              </th>
              {LOCATIONS.map((location) => (
                <th key={location} className="border border-black p-2 text-center font-bold">
                  {location}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => {
              const rowTeachers = LOCATIONS.map((location) => getAssignmentsForCell(day, location));
              const maxTeachers = Math.max(...rowTeachers.map((t) => t.length), 1);

              return (
                <tr key={day}>
                  <td className="border border-black p-2 font-bold align-top">{day}</td>
                  {LOCATIONS.map((location) => {
                    const teachers = getAssignmentsForCell(day, location);
                    return (
                      <td key={`${day}-${location}`} className="border border-black p-2 align-top">
                        {teachers.length > 0 ? (
                          <div className="space-y-1">
                            {teachers.map((teacher) => (
                              <div key={teacher.id}>{teacher.name}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer Note */}
        <p className="mt-4 text-sm">
          *Забележка: 1- дежури от 07:30-08:00 ч.; 2-дежури от 08:00 до 08:40
        </p>
      </div>
    );
  }
);

PrintableSchedule.displayName = "PrintableSchedule";
