import { useState } from "react";
import { VaccineReservationForm } from "./VaccineReservationForm";
import { VaccineReservationsList } from "./VaccineReservationsList";

export const VaccineReservationsTab = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReservationCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <VaccineReservationForm onReservationCreated={handleReservationCreated} />
      <VaccineReservationsList key={refreshKey} />
    </div>
  );
};
