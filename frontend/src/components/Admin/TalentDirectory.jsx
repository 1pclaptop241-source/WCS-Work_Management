import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { talentAPI } from '@/services/api';
import { Search, MapPin, DollarSign, Star } from "lucide-react";

const TalentDirectory = () => {
    const [talents, setTalents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchTalent = async () => {
        setLoading(true);
        try {
            const response = await talentAPI.getAll({ search });
            setTalents(response.data);
        } catch (error) {
            console.error("Failed to fetch talent", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTalent();
        }, 500); // Debounce
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Talent Pool</h1>
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or skill..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading talent...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {talents.map((talent) => (
                        <Card key={talent._id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${talent.user.email}`} />
                                    <AvatarFallback>{talent.user.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg">{talent.user.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{talent.title || 'Creative Professional'}</p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm line-clamp-2 mb-4 text-muted-foreground">
                                    {talent.bio || "No bio available yet."}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {talent.skills?.map(skill => (
                                        <Badge key={skill} variant="secondary">{skill}</Badge>
                                    ))}
                                    {(!talent.skills || talent.skills.length === 0) && (
                                        <span className="text-xs text-muted-foreground italic">No listed skills</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium">
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                        <span>${talent.hourlyRate}/hr</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <span>{talent.rating || 'New'}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" variant="outline">View Profile</Button>
                            </CardFooter>
                        </Card>
                    ))}
                    {talents.length === 0 && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            No talent found matching your search.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TalentDirectory;
