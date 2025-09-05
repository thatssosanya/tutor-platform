export const MONTH_NAMES_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
]

export const WEEKDAY_NAMES_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

export function getMonthName(
  monthIndex: number,
  format: "nominative" = "nominative"
): string {
  const names = format === "nominative" ? MONTH_NAMES_NOMINATIVE : []
  return names[monthIndex] ?? ""
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday-first week
}

export function determineYearForMonth(month: number): number {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  return month < currentMonth ? currentYear + 1 : currentYear
}

export function parseDateString(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})$/)
  if (!match) return null

  const day = parseInt(match[1]!, 10)
  const month = parseInt(match[2]!, 10) - 1

  if (month < 0 || month > 11) return null

  const year = determineYearForMonth(month)
  const daysInMonth = getDaysInMonth(year, month)
  if (day < 1 || day > daysInMonth) return null

  return new Date(year, month, day)
}

export function formatDateToString(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}.${month}`
}

export function isCompleteDate(input: string): boolean {
  return /^\d{2}\.\d{2}$/.test(input)
}
