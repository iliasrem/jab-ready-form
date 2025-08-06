import { AppointmentForm } from "@/components/AppointmentForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Book Your Appointment</h1>
          <p className="text-xl text-muted-foreground">Schedule your visit with our professional team</p>
        </div>
        <AppointmentForm />
      </div>
    </div>
  );
};

export default Index;
