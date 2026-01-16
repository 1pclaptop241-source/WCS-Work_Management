import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Mail, HelpCircle, Phone, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SupportPage = ({ onClose, userRole }) => {
    // Keep internal state for potential future logic, though currently unused as we use mailto
    // eslint-disable-next-line no-unused-vars
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        email: ''
    });

    const contactEmails = {
        general: "wisecutstudios@gmail.com",
        tech: "wisecutstudios@gmail.com",
        billing: "wisecutstudios@gmail.com"
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 bg-muted/20">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <HelpCircle className="h-6 w-6 text-primary" />
                        Support & Help
                    </DialogTitle>
                    <DialogDescription>
                        Get help with your projects, payments, or technical issues.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-4">
                    <div className="space-y-8">
                        {/* Contact Information Section */}
                        <section className="space-y-4">
                            <h3 className="flex items-center gap-2 font-semibold text-lg text-primary">
                                <Mail className="h-5 w-5" />
                                Contact Information
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">General Support</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <a href={`mailto:${contactEmails.general}`} className="text-primary font-medium hover:underline text-sm md:text-base">
                                            {contactEmails.general}
                                        </a>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Technical & Billing</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-1">
                                            <a href={`mailto:${contactEmails.tech}`} className="text-primary font-medium hover:underline text-sm md:text-base block">
                                                {contactEmails.tech}
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        <Separator />

                        {/* FAQ Section */}
                        <section className="space-y-4">
                            <h3 className="flex items-center gap-2 font-semibold text-lg text-primary">
                                <Info className="h-5 w-5" />
                                Frequently Asked Questions
                            </h3>

                            <div className="space-y-4">
                                {userRole === 'client' ? (
                                    <>
                                        <FAQItem
                                            question="How do I create a new project?"
                                            answer="Click the 'Create Project' button on your dashboard, fill in the project details, and submit. An admin will review and accept your project."
                                        />
                                        <FAQItem
                                            question="How can I track my project progress?"
                                            answer="Navigate to 'Ongoing Projects' to view all your active projects. Click on any project to see detailed work breakdowns and status updates."
                                        />
                                        <FAQItem
                                            question="When will I receive my completed work?"
                                            answer="You can view submitted work in the project details. Once you approve the work, it will be marked as completed."
                                        />
                                        <FAQItem
                                            question="How do I make payments?"
                                            answer="Go to the Payments section to view pending payments and make transactions. All payment records are tracked in your dashboard."
                                        />
                                    </>
                                ) : (
                                    <>
                                        <FAQItem
                                            question="How do I view my assigned tasks?"
                                            answer="All your assigned work items are displayed on the 'Assigned Works' tab. Click on any work card to upload or manage your submissions."
                                        />
                                        <FAQItem
                                            question="How do I upload my work?"
                                            answer="Click on a work card, then use the upload section to submit your files. You can upload images, videos, or other required formats."
                                        />
                                        <FAQItem
                                            question="What if corrections are requested?"
                                            answer="If corrections are needed, you'll see a 'Corrections Needed' status. Review the feedback and upload the corrected version."
                                        />
                                        <FAQItem
                                            question="When will I receive payment?"
                                            answer="Check the 'Payment Information' tab to view your payment status. Payments are processed after your work is approved by both client and admin."
                                        />
                                    </>
                                )}
                            </div>
                        </section>

                        <div className="bg-muted p-4 rounded-lg flex items-start gap-3 text-sm text-muted-foreground">
                            <Phone className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-foreground mb-1">Support Hours</p>
                                <p>Mon - Fri: 9:00 AM - 6:00 PM (IST)</p>
                                <p>Sat: 10:00 AM - 4:00 PM (IST)</p>
                                <p className="mt-2 text-xs italic">We aim to respond to all inquiries within 24 business hours.</p>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

const FAQItem = ({ question, answer }) => (
    <div className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
        <h4 className="font-semibold text-sm mb-2 text-foreground">{question}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
    </div>
);

export default SupportPage;
