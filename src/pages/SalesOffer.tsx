import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { generateProperPizzaOffer } from "@/lib/generateSalesOfferPdf";

const SalesOffer = () => {
  const handleDownload = async () => {
    await generateProperPizzaOffer();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Sales Offer Generator</h1>
          <p className="text-muted-foreground">Generate a branded commercial offer PDF for Proper Pizza</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-left max-w-md mx-auto space-y-2 text-sm">
          <p><span className="font-semibold">Client:</span> Proper Pizza (properpizza.ro)</p>
          <p><span className="font-semibold">Scale:</span> 260 employees, 9 locations</p>
          <p><span className="font-semibold">Core Package:</span> Scheduling, Tasks, Audits, Mystery Client</p>
          <p><span className="font-semibold">List Price:</span> 1,550 EUR + VAT / month</p>
          <p><span className="font-semibold text-emerald-600 dark:text-emerald-400">Discount:</span> <span className="text-emerald-600 dark:text-emerald-400">-20%</span></p>
          <p><span className="font-semibold text-primary">Final Price:</span> <span className="text-primary font-bold">1,240 EUR + VAT (21%) / month</span></p>
          <p><span className="font-semibold">Bonus:</span> All other restaurant modules + platform setup FREE</p>
        </div>

        <Button size="lg" onClick={handleDownload} className="gap-2">
          <FileDown className="h-5 w-5" />
          Download Offer PDF
        </Button>
      </div>
    </div>
  );
};

export default SalesOffer;
