import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { Briefcase } from "lucide-react";

const WorkspaceSwitcher = () => {
    const { user, currentOrg, switchOrganization } = useAuth();

    // If user only has 1 or 0 orgs, don't show switcher
    if (!user?.memberships || user.memberships.length < 2) return null;

    return (
        <div className="flex items-center gap-2 mr-4">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <Select
                value={currentOrg?._id}
                onValueChange={(value) => switchOrganization(value)}
            >
                <SelectTrigger className="w-[180px] h-8 text-xs font-medium">
                    <SelectValue placeholder="Select Workspace" />
                </SelectTrigger>
                <SelectContent>
                    {user.memberships.map((m) => (
                        <SelectItem key={m.organization._id} value={m.organization._id}>
                            {m.organization.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default WorkspaceSwitcher;
