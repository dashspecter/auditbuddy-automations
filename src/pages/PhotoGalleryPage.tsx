import { Header } from "@/components/Header";
import { PhotoGallery } from "@/components/PhotoGallery";
import { Card } from "@/components/ui/card";
import { Images } from "lucide-react";

const PhotoGalleryPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-safe">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Images className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Photo Gallery
              </h1>
              <p className="text-muted-foreground">
                Browse and manage all audit photos
              </p>
            </div>
          </div>

          <PhotoGallery showDeleteButton={true} />
        </div>
      </main>
    </div>
  );
};

export default PhotoGalleryPage;
