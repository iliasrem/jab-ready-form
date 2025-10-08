import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Download, Printer, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface AppointmentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentData: {
    firstName: string;
    lastName: string;
    phone: string;
    date: Date;
    time: string;
    services: string[];
    notes?: string;
  };
}

function generateICalFile(data: AppointmentConfirmationDialogProps["appointmentData"]) {
  const [hh, mm] = data.time.split(":").map((n) => parseInt(n, 10));
  const start = new Date(data.date);
  start.setHours(hh || 0, mm || 0, 0, 0);
  const end = new Date(start.getTime() + 15 * 60 * 1000);

  const toICSDate = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${y}${m}${d}T${hh}${mm}${ss}`;
  };

  const uid = `${crypto.randomUUID()}@remili.be`;
  const dtstamp = toICSDate(new Date());
  const dtstart = toICSDate(start);
  const dtend = toICSDate(end);
  const summary = "Rendez-vous Pharmacie Remili-Bastin";
  const description = `Services: ${data.services.join(", ")}${data.notes ? `\\nNotes: ${data.notes}` : ""}`;
  const location = "Pharmacie Remili-Bastin, Rue Solvay 64, 7160 Chapelle-lez-Herlaimont";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pharmacie Remili-Bastin//Appointment//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return icsContent;
}

function downloadICalFile(data: AppointmentConfirmationDialogProps["appointmentData"]) {
  const icsContent = generateICalFile(data);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rendez-vous-${format(data.date, "yyyy-MM-dd")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function printConfirmation(data: AppointmentConfirmationDialogProps["appointmentData"]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Confirmation de rendez-vous</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #333;
            margin: 0 0 10px 0;
          }
          .section {
            margin: 20px 0;
          }
          .section h2 {
            color: #666;
            font-size: 16px;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            padding: 8px 0;
          }
          .info-label {
            font-weight: bold;
            width: 200px;
            color: #555;
          }
          .info-value {
            flex: 1;
          }
          .services-list {
            list-style: none;
            padding: 0;
          }
          .services-list li {
            padding: 5px 0;
            padding-left: 20px;
            position: relative;
          }
          .services-list li:before {
            content: "•";
            position: absolute;
            left: 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Pharmacie Remili-Bastin</h1>
          <p>Confirmation de rendez-vous</p>
        </div>

        <div class="section">
          <h2>Informations du patient</h2>
          <div class="info-row">
            <span class="info-label">Nom complet :</span>
            <span class="info-value">${data.firstName} ${data.lastName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Téléphone :</span>
            <span class="info-value">${data.phone}</span>
          </div>
        </div>

        <div class="section">
          <h2>Détails du rendez-vous</h2>
          <div class="info-row">
            <span class="info-label">Date :</span>
            <span class="info-value">${format(data.date, "PPPP", { locale: fr })}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Heure :</span>
            <span class="info-value">${data.time}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Services :</span>
            <span class="info-value">
              <ul class="services-list">
                ${data.services.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </span>
          </div>
          ${data.notes ? `
          <div class="info-row">
            <span class="info-label">Notes :</span>
            <span class="info-value">${data.notes}</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>Lieu</h2>
          <div class="info-row">
            <span class="info-label">Adresse :</span>
            <span class="info-value">Rue Solvay 64<br>7160 Chapelle-lez-Herlaimont</span>
          </div>
        </div>

        <div class="footer">
          <p><strong>Notes importantes</strong></p>
          <p>• Veuillez arriver 15 minutes avant votre rendez-vous</p>
          <p>• Apportez une pièce d'identité valide</p>
          <p>• Les annulations doivent être faites 24 heures à l'avance</p>
          <p style="margin-top: 20px;">
            <strong>Contact :</strong> 064 44 22 53 | info@remili.be
          </p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

function printReceiptTicket(data: AppointmentConfirmationDialogProps["appointmentData"]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket de rendez-vous</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', monospace;
            padding: 10mm;
            margin: 0;
            width: 80mm;
            font-size: 12pt;
          }
          .ticket {
            text-align: center;
          }
          .header {
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 8mm;
            border-bottom: 2px dashed #000;
            padding-bottom: 5mm;
          }
          .content {
            margin: 5mm 0;
            text-align: left;
          }
          .line {
            margin: 3mm 0;
            display: flex;
            justify-content: space-between;
          }
          .label {
            font-weight: bold;
          }
          .footer {
            margin-top: 8mm;
            padding-top: 5mm;
            border-top: 2px dashed #000;
            font-size: 10pt;
          }
          @media print {
            body {
              width: 80mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            PHARMACIE REMILI-BASTIN<br>
            RENDEZ-VOUS
          </div>
          
          <div class="content">
            <div class="line">
              <span class="label">Patient:</span>
            </div>
            <div class="line">
              <span>${data.firstName} ${data.lastName}</span>
            </div>
            
            <div class="line" style="margin-top: 5mm;">
              <span class="label">Date:</span>
            </div>
            <div class="line">
              <span>${format(data.date, "dd/MM/yyyy", { locale: fr })}</span>
            </div>
            
            <div class="line" style="margin-top: 5mm;">
              <span class="label">Heure:</span>
            </div>
            <div class="line">
              <span>${data.time}</span>
            </div>
          </div>
          
          <div class="footer">
            Merci de votre visite
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

export function AppointmentConfirmationDialog({
  open,
  onOpenChange,
  appointmentData,
}: AppointmentConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Confirmation de rendez-vous
          </DialogTitle>
          <DialogDescription>
            Votre rendez-vous a été créé avec succès
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient Info */}
          <div>
            <h3 className="font-semibold mb-3 text-base sm:text-lg">Informations du patient</h3>
            <div className="space-y-2 bg-muted/50 p-3 sm:p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm sm:text-base text-muted-foreground">Nom complet :</span>
                <span className="font-medium text-sm sm:text-base">
                  {appointmentData.firstName} {appointmentData.lastName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm sm:text-base text-muted-foreground">Téléphone :</span>
                <span className="font-medium text-sm sm:text-base">{appointmentData.phone}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Appointment Details */}
          <div>
            <h3 className="font-semibold mb-3 text-base sm:text-lg">Détails du rendez-vous</h3>
            <div className="space-y-2 bg-muted/50 p-3 sm:p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm sm:text-base text-muted-foreground">Date :</span>
                <span className="font-medium text-sm sm:text-base">
                  {format(appointmentData.date, "PPPP", { locale: fr })}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm sm:text-base text-muted-foreground">Heure :</span>
                <span className="font-medium text-sm sm:text-base text-primary">{appointmentData.time}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0">
                <span className="text-sm sm:text-base text-muted-foreground">Services :</span>
                <div className="sm:text-right">
                  {appointmentData.services.map((service, index) => (
                    <div key={index} className="font-medium text-sm sm:text-base">
                      {service}
                    </div>
                  ))}
                </div>
              </div>
              {appointmentData.notes && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-muted-foreground">Notes :</span>
                  <span className="font-medium text-sm sm:text-base sm:text-right max-w-xs">
                    {appointmentData.notes}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div>
            <h3 className="font-semibold mb-3 text-base sm:text-lg">Lieu</h3>
            <div className="bg-muted/50 p-3 sm:p-4 rounded-lg">
              <p className="font-medium text-sm sm:text-base">Pharmacie Remili-Bastin</p>
              <p className="text-muted-foreground text-sm sm:text-base">Rue Solvay 64</p>
              <p className="text-muted-foreground text-sm sm:text-base">7160 Chapelle-lez-Herlaimont</p>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
            <h4 className="font-semibold mb-2">Notes importantes</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Veuillez arriver 15 minutes avant votre rendez-vous</li>
              <li>• Apportez une pièce d'identité valide</li>
              <li>• Les annulations doivent être faites 24 heures à l'avance</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => printConfirmation(appointmentData)}
                variant="outline"
                className="flex-1"
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimer complet
              </Button>
              <Button
                onClick={() => printReceiptTicket(appointmentData)}
                variant="outline"
                className="flex-1"
              >
                <Printer className="mr-2 h-4 w-4" />
                Ticket de caisse
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => downloadICalFile(appointmentData)}
                variant="outline"
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger iCal
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
