import { ChevronLeft, ChevronRight } from "lucide-react"
import React, { useEffect, useMemo,useState } from "react"

import { cn } from "@/styles"
import { Button, Input, Row, Stack } from "@/ui"
import {
  determineYearForMonth,
  getDaysInMonth,
  getFirstDayOfMonth,
  getMonthName,
  isCompleteDate,
  MONTH_NAMES_NOMINATIVE,
  parseDateString,
  WEEKDAY_NAMES_SHORT,
} from "@/utils/date"

import { Popover } from "./Popover"

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "ДД.ММ",
}: DatePickerProps) {
  const [displayDate, setDisplayDate] = useState(() => {
    const parsed = parseDateString(value)
    return parsed ?? new Date()
  })

  useEffect(() => {
    const parsed = parseDateString(value)
    if (parsed) {
      setDisplayDate(parsed)
    } else if (!value) {
      setDisplayDate(new Date())
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    handleChange(rawValue)
  }

  const handleChange = (rawValue: string) => {
    let filteredValue = rawValue.replace(/[^0-9]/g, "")
    if (filteredValue.length >= 4) {
      let dd = parseInt(filteredValue.slice(0, 2))
      let mm = parseInt(filteredValue.slice(2, 4))
      mm = mm === 0 ? 12 : Math.min(Math.max(1, mm), 12)
      const date = parseDateString("01." + mm.toString().padStart(2, "0"))
      if (date) {
        dd = Math.min(
          Math.max(1, dd),
          getDaysInMonth(date.getFullYear(), mm - 1)
        )
      }
      filteredValue =
        dd.toString().padStart(2, "0") + mm.toString().padStart(2, "0")
    }
    if (filteredValue.length > 2) {
      filteredValue = filteredValue.slice(0, 2) + "." + filteredValue.slice(2)
    }
    onChange(filteredValue)
  }

  const isValueComplete = useMemo(() => {
    return isCompleteDate(value) && parseDateString(value) !== null
  }, [value])

  const CalendarView = ({ close }: { close: () => void }) => {
    const year = displayDate.getFullYear()
    const month = displayDate.getMonth()
    const selectedDay = displayDate.getDate()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const blanks = Array.from({ length: firstDay })
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const parsedValue = parseDateString(value)
    const isCurrentMonth =
      parsedValue?.getMonth() === month && parsedValue?.getFullYear() === year

    const handleMonthChange = (amount: number) => {
      handleChange(
        value.slice(0, 3) +
          ((12 + parseInt(value.slice(4)) + amount) % 12)
            .toString()
            .padStart(2, "0")
      )
    }

    const handleDayClick = (day: number) => {
      const monthString = String(month + 1).padStart(2, "0")
      const dayString = String(day).padStart(2, "0")
      onChange(`${dayString}.${monthString}`)
      close()
    }

    return (
      <Stack className="gap-4">
        <Row className="items-center justify-between">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleMonthChange(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-center font-semibold text-primary">
            {getMonthName(month)}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleMonthChange(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Row>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {WEEKDAY_NAMES_SHORT.map((day) => (
            <div key={day} className="font-medium text-secondary">
              {day}
            </div>
          ))}
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-8 w-8 rounded-full transition-colors cursor-pointer",
                "hover:bg-muted",
                isCurrentMonth &&
                  selectedDay === day &&
                  "bg-accent text-on-accent hover:bg-accent-highlight"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </Stack>
    )
  }

  const MonthListView = () => {
    const handleMonthSelect = (monthIndex: number) => {
      const dayPart = value.split(".")[0]
      let day = parseInt(dayPart!, 10)

      if (isNaN(day) || day < 1) {
        day = 1
      }

      const year = determineYearForMonth(monthIndex)
      const maxDays = getDaysInMonth(year, monthIndex)
      day = Math.min(day, maxDays)

      const dayString = String(day).padStart(2, "0")
      const monthString = String(monthIndex + 1).padStart(2, "0")

      onChange(`${dayString}.${monthString}`)
    }
    return (
      <Stack className="max-h-60 gap-1 overflow-y-auto">
        {MONTH_NAMES_NOMINATIVE.map((name, index) => (
          <button
            key={name}
            className="rounded p-2 text-left text-sm text-primary hover:bg-muted cursor-pointer"
            onClick={() => handleMonthSelect(index)}
          >
            {name}
          </button>
        ))}
      </Stack>
    )
  }

  return (
    <Popover.Root className={cn("relative", className)}>
      <Popover.Button
        as={Input}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
      />
      <Popover.Panel>
        {({ close }) =>
          isValueComplete ? <CalendarView close={close} /> : <MonthListView />
        }
      </Popover.Panel>
    </Popover.Root>
  )
}
