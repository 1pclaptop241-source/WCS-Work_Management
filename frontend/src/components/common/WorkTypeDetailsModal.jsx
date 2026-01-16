import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, FileText, Link as LinkIcon, ExternalLink } from "lucide-react";

const WorkTypeDetailsModal = ({ workBreakdown, onClose }) => {
    if (!workBreakdown) return null;

    const hasDetails = (workBreakdown.shareDetails && workBreakdown.shareDetails.trim()) ||
        (workBreakdown.adminInstructions && workBreakdown.adminInstructions.trim()) ||
        (workBreakdown.clientInstructions && workBreakdown.clientInstructions.trim());
    const hasLinks = workBreakdown.links && workBreakdown.links.length > 0;

    return (
        <Dialog open={!!workBreakdown} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl">
                        Work Type Details: <span className="text-primary">{workBreakdown.workType}</span>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-2">
                    <div className="space-y-6 pb-6">
                        {!hasDetails && !hasLinks ? (
                            <div className="text-center py-8 text-muted-foreground italic">
                                No additional details or links were shared for this work type.
                            </div>
                        ) : (
                            <>
                                {workBreakdown.clientInstructions && workBreakdown.clientInstructions.trim() && (
                                    <div className="space-y-2">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                                            <User className="h-4 w-4" /> Client Instructions
                                        </h3>
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md text-sm text-blue-900 whitespace-pre-wrap">
                                            {workBreakdown.clientInstructions}
                                        </div>
                                    </div>
                                )}

                                {(workBreakdown.adminInstructions || (workBreakdown.shareDetails && workBreakdown.shareDetails.trim())) && (
                                    <div className="space-y-3">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                                            <FileText className="h-4 w-4" /> Admin Instructions
                                        </h3>

                                        <Card className="bg-emerald-50/30 border-emerald-100">
                                            <CardContent className="p-4 space-y-4 text-sm">
                                                {workBreakdown.adminInstructions && (
                                                    <div>
                                                        <div className="font-medium text-emerald-900 mb-1">Internal Note:</div>
                                                        <p className="text-emerald-800 whitespace-pre-wrap">{workBreakdown.adminInstructions}</p>
                                                    </div>
                                                )}

                                                {workBreakdown.shareDetails && workBreakdown.shareDetails.trim() && (
                                                    <>
                                                        {workBreakdown.adminInstructions && <Separator className="bg-emerald-200" />}
                                                        <div>
                                                            {workBreakdown.adminInstructions && <div className="font-medium text-emerald-900 mb-1">Additional Details:</div>}
                                                            <p className="text-emerald-800 whitespace-pre-wrap">{workBreakdown.shareDetails}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {hasLinks && (
                                    <div className="space-y-3">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-600">
                                            <LinkIcon className="h-4 w-4" /> Shared Links
                                        </h3>
                                        <div className="grid gap-2">
                                            {workBreakdown.links.map((link, index) => (
                                                <a
                                                    key={index}
                                                    href={link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                                                >
                                                    <span className="font-medium text-sm truncate">{link.title || `Link ${index + 1}`}</span>
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default WorkTypeDetailsModal;
