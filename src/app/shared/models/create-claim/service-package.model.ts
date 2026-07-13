/** Response of GET api/Approval/service-packages (a contract-service package). */
export interface ServicePackageDto {
  packageId: number;
  packageName: string | null;
  packagePrice: number;
  /** contract_service_id of every service that belongs to this package. */
  serviceIds: number[];
}

/**
 * Returns the packages that are fully covered by the selected service ids —
 * i.e. every service of the package is present in the current selection.
 * A package with no services is never matched.
 */
export function findCoveredPackages(
  selectedServiceIds: Array<number | null | undefined>,
  packages: ServicePackageDto[]
): ServicePackageDto[] {
  const selected = new Set(
    selectedServiceIds
      .filter((id): id is number => typeof id === 'number' && id > 0)
      .map(Number)
  );

  return packages.filter(
    pkg => pkg.serviceIds.length > 0 && pkg.serviceIds.every(id => selected.has(id))
  );
}
