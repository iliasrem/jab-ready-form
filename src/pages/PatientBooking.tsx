import { useState, useEffect } from "react";
import { AppointmentForm } from "@/components/AppointmentForm";
import { DayAvailability } from "@/components/AvailabilityManager";

// Mock availability data - in a real app this would come from your backend
const defaultAvailability: DayAvailability[] = [
  {
    day: "Monday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:30", available: true },
      { time: "10:00", available: true },
      { time: "10:30", available: true },
      { time: "11:00", available: true },
      { time: "11:30", available: true },
      { time: "12:00", available: false }, // Lunch break
      { time: "12:30", available: false }, // Lunch break
      { time: "13:00", available: true },
      { time: "13:30", available: true },
      { time: "14:00", available: true },
      { time: "14:30", available: true },
      { time: "15:00", available: true },
      { time: "15:30", available: true },
      { time: "16:00", available: true },
      { time: "16:30", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Tuesday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:30", available: true },
      { time: "10:00", available: true },
      { time: "10:30", available: true },
      { time: "11:00", available: true },
      { time: "11:30", available: true },
      { time: "12:00", available: false },
      { time: "12:30", available: false },
      { time: "13:00", available: true },
      { time: "13:30", available: true },
      { time: "14:00", available: true },
      { time: "14:30", available: true },
      { time: "15:00", available: true },
      { time: "15:30", available: true },
      { time: "16:00", available: true },
      { time: "16:30", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Wednesday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:30", available: true },
      { time: "10:00", available: true },
      { time: "10:30", available: true },
      { time: "11:00", available: true },
      { time: "11:30", available: true },
      { time: "12:00", available: false },
      { time: "12:30", available: false },
      { time: "13:00", available: true },
      { time: "13:30", available: true },
      { time: "14:00", available: true },
      { time: "14:30", available: true },
      { time: "15:00", available: true },
      { time: "15:30", available: true },
      { time: "16:00", available: true },
      { time: "16:30", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Thursday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:30", available: true },
      { time: "10:00", available: true },
      { time: "10:30", available: true },
      { time: "11:00", available: true },
      { time: "11:30", available: true },
      { time: "12:00", available: false },
      { time: "12:30", available: false },
      { time: "13:00", available: true },
      { time: "13:30", available: true },
      { time: "14:00", available: true },
      { time: "14:30", available: true },
      { time: "15:00", available: true },
      { time: "15:30", available: true },
      { time: "16:00", available: true },
      { time: "16:30", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Friday",
    enabled: true,
    timeSlots: [
      { time: "09:00", available: true },
      { time: "09:30", available: true },
      { time: "10:00", available: true },
      { time: "10:30", available: true },
      { time: "11:00", available: true },
      { time: "11:30", available: true },
      { time: "12:00", available: false },
      { time: "12:30", available: false },
      { time: "13:00", available: true },
      { time: "13:30", available: true },
      { time: "14:00", available: true },
      { time: "14:30", available: true },
      { time: "15:00", available: true },
      { time: "15:30", available: true },
      { time: "16:00", available: true },
      { time: "16:30", available: true },
      { time: "17:00", available: true }
    ]
  },
  {
    day: "Saturday",
    enabled: false,
    timeSlots: []
  },
  {
    day: "Sunday",
    enabled: false,
    timeSlots: []
  }
];

const PatientBooking = () => {
  const [availability, setAvailability] = useState<DayAvailability[]>([]);

  useEffect(() => {
    // In a real app, you would fetch this from your backend
    setAvailability(defaultAvailability);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-2">Book Your Appointment</h1>
          <p className="text-xl opacity-90">Schedule your visit with our medical team</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Instructions */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Easy Online Booking</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-medium mb-2">Fill Information</h3>
                <p className="text-sm text-muted-foreground">Enter your personal details and contact information</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-medium mb-2">Choose Date & Time</h3>
                <p className="text-sm text-muted-foreground">Select your preferred appointment date and time slot</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-medium mb-2">Confirm Booking</h3>
                <p className="text-sm text-muted-foreground">Review and submit your appointment request</p>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <AppointmentForm availability={availability} />

          {/* Additional Information */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Our Services</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Vaccine:</strong> Immunizations and preventive care</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Cosmetic:</strong> Aesthetic treatments and procedures</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="font-semibold mb-3">Important Notes</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Please arrive 15 minutes before your appointment</li>
                <li>• Bring a valid ID and insurance card</li>
                <li>• Cancellations must be made 24 hours in advance</li>
                <li>• We'll send a confirmation email after booking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-muted/30 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            Need help? Contact us at{" "}
            <a href="tel:+1234567890" className="text-primary hover:underline">
              (123) 456-7890
            </a>{" "}
            or{" "}
            <a href="mailto:appointments@clinic.com" className="text-primary hover:underline">
              appointments@clinic.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PatientBooking;