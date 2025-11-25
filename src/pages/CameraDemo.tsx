import { useState } from "react";
import { Header } from "@/components/Header";
import { CameraCapture } from "@/components/CameraCapture";
import { Card } from "@/components/ui/card";

const CameraDemo = () => {
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const handlePhotoUploaded = (url: string) => {
    setUploadedPhotos((prev) => [url, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-safe">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Camera Capture
            </h1>
            <p className="text-muted-foreground">
              Take photos or select from gallery and upload to storage
            </p>
          </div>

          <CameraCapture onPhotoUploaded={handlePhotoUploaded} />

          {uploadedPhotos.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Uploaded Photos</h2>
              <div className="grid grid-cols-2 gap-4">
                {uploadedPhotos.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Uploaded ${index + 1}`}
                    className="rounded-lg w-full h-40 object-cover"
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default CameraDemo;
