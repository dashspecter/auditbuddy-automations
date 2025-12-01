import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDocument } from "@/hooks/useDocuments";
import { useDocumentReads, useMarkDocumentRead } from "@/hooks/useDocumentReads";
import { ArrowLeft, Download, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirmedUnderstood, setConfirmedUnderstood] = useState(false);

  const { data: document } = useDocument(id);
  const { data: reads } = useDocumentReads(id);
  const markAsRead = useMarkDocumentRead();

  const handleMarkAsRead = () => {
    if (!id) return;
    markAsRead.mutate({
      documentId: id,
      confirmedUnderstood,
    });
  };

  const handleDownload = () => {
    if (document?.file_url) {
      window.open(document.file_url, "_blank");
    }
  };

  if (!document) {
    return (
      <AppLayout>
        <div className="text-center py-12">Loading document...</div>
      </AppLayout>
    );
  }

  const alreadyRead = reads?.some(r => r.confirmed_understood);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/documents")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            {!alreadyRead && (
              <Button onClick={handleMarkAsRead} disabled={markAsRead.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Read
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {document.document_categories && (
                    <Badge variant="secondary">{document.document_categories.name}</Badge>
                  )}
                  {document.locations && (
                    <Badge variant="outline">{document.locations.name}</Badge>
                  )}
                  {document.module_scope && (
                    <Badge>{document.module_scope}</Badge>
                  )}
                  {document.required_reading && (
                    <Badge variant="destructive">Required Reading</Badge>
                  )}
                  {alreadyRead && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Read & Confirmed
                    </Badge>
                  )}
                </div>
              </div>
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {document.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{document.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">File Name</p>
                <p className="font-medium">{document.file_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">File Size</p>
                <p className="font-medium">
                  {document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Uploaded</p>
                <p className="font-medium">{format(new Date(document.created_at), "PPP")}</p>
              </div>
              {document.renewal_date && (
                <div>
                  <p className="text-muted-foreground">Renewal Date</p>
                  <p className="font-medium">{format(new Date(document.renewal_date), "PPP")}</p>
                </div>
              )}
            </div>

            {document.required_reading && !alreadyRead && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirm"
                      checked={confirmedUnderstood}
                      onCheckedChange={(checked) => setConfirmedUnderstood(checked as boolean)}
                    />
                    <label
                      htmlFor="confirm"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I have read and understood this document
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {reads && reads.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Read History</h3>
                <div className="space-y-2">
                  {reads.map((read) => (
                    <div key={read.id} className="flex items-center justify-between text-sm py-2 border-b">
                      <span className="text-muted-foreground">
                        {format(new Date(read.read_at), "PPP 'at' p")}
                      </span>
                      {read.confirmed_understood && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DocumentDetail;