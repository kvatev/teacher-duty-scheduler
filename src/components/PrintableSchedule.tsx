import React, { forwardRef, useMemo } from "react";
import { DAYS, CellTeacher, SchoolPeriod } from "@/types/schedule";
import { AppSettings } from "@/hooks/useAppSettings";
import logoImage from "@/assets/su-konstantin-petkanов-logo.png";

interface PrintableScheduleProps {
  getAssignmentsForCell: (day: string, location: string) => CellTeacher[];
  currentPeriod: SchoolPeriod;
  settings: AppSettings;
}

export const PrintableSchedule = forwardRef<HTMLDivElement, PrintableScheduleProps>(
  ({ getAssignmentsForCell, currentPeriod, settings }, ref) => {
    if (!currentPeriod) {
      return null;
    }

    const locations = [settings.location_1, settings.location_2, settings.location_3, settings.location_4];
    
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
            <h1 className="text-xl font-bold mb-1">{settings.pdf_school_name}</h1>
            <p className="text-sm">{settings.pdf_school_info1}</p>
            <p className="text-sm">{settings.pdf_school_info2}</p>
            <div className="border-b-2 border-black mt-2 mx-auto w-3/4"></div>
          </div>
          <img src={logoImage} alt="Лого" className="w-16 h-16 object-contain" />
        </div>

        {/* Approval Section */}
        <div className="mb-4 mt-6">
          <p className="font-bold">УТВЪРЖДАВАМ:</p>
          <p className="font-bold">{settings.pdf_director_name}</p>
          <p className="font-bold">ДИРЕКТОР</p>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">ГРАФИК</h2>
          <p className="text-sm">
            {settings.pdf_schedule_description} {termText}, {yearText}
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
            {DAYS.map((day) => (
              <tr key={day}>
                <td className="border border-black p-2 font-bold align-top">{day}</td>
                {LOCATIONS.map((location) => {
                  const teachers = getAssignmentsForCell(day, location);
                  return (
                    <td key={`${day}-${location}`} className="border border-black p-2 align-top">
                      {teachers.length > 0 ? (
                        <div className="space-y-1">
                          {teachers.map((teacher) => (
                            <div key={teacher.id}>
                              {teacher.shiftNumber ? `${teacher.shiftNumber}. ` : ""}{teacher.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Note */}
        <p className="mt-4 text-sm">{settings.footer_note}</p>
      </div>
    );
  }
);

PrintableSchedule.displayName = "PrintableSchedule";
