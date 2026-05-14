/**
 * UX-03 — 시설 표시 포맷터
 * D-06: 주차 → "세대당 N.N대" (소수점 1자리)
 * D-07: 엘리베이터 → "동당 N대" (정수). building_count null → null (항목 숨김)
 */
export function formatParkingPerUnit(
  parkingCount: number | null,
  householdCount: number | null,
): string | null {
  if (parkingCount == null) return null
  if (householdCount == null || householdCount <= 0) return null
  return (parkingCount / householdCount).toFixed(1)
}

export function formatElevatorPerBuilding(
  elevatorCount: number | null,
  buildingCount: number | null,
): string | null {
  if (elevatorCount == null) return null
  if (buildingCount == null || buildingCount <= 0) return null
  return String(Math.round(elevatorCount / buildingCount))
}
