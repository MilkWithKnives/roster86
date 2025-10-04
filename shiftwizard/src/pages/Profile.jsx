import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, CheckCircle, Lock } from 'lucide-react';

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        phone_number: '',
        employee_number: '',
        ssn: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                setIsLoading(true);
                const currentUser = await User.me();
                setUser(currentUser);
                setFormData({
                    phone_number: currentUser.phone_number || '',
                    employee_number: currentUser.employee_number || '',
                    ssn: currentUser.ssn || ''
                });
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await User.updateMyUserData(formData);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to update user data:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Skeleton className="h-12 w-1/3" />
                <Card className="glass-card">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gradient">My Profile</h1>
                <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>View and manage your personal information.</p>
            </div>

            <Card className="premium-card">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>This information is private and will only be used for scheduling and payroll purposes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input id="full_name" value={user.full_name} disabled className="modern-button" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" value={user.email} disabled className="modern-button" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone_number">Phone Number</Label>
                                <Input 
                                    id="phone_number" 
                                    value={formData.phone_number} 
                                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                                    placeholder="e.g., (555) 123-4567"
                                    className="modern-button"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="employee_number">Employee Number</Label>
                                <Input 
                                    id="employee_number" 
                                    value={formData.employee_number}
                                    onChange={(e) => handleInputChange('employee_number', e.target.value)}
                                    placeholder="e.g., EMP12345"
                                    className="modern-button"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ssn">Social Security Number (SSN)</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                <Input 
                                    id="ssn"
                                    type="password"
                                    value={formData.ssn}
                                    onChange={(e) => handleInputChange('ssn', e.target.value)}
                                    placeholder="***-**-****"
                                    className="modern-button pl-10"
                                />
                            </div>
                             <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Your SSN is encrypted and stored securely.</p>
                        </div>

                        <div className="flex justify-end items-center gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-primary)'}}>
                            <div className="flex items-center gap-2 h-8">
                                {isSaving && (
                                    <>
                                        <Save className="w-4 h-4 animate-pulse" />
                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Saving...</span>
                                    </>
                                )}
                                {showSuccess && !isSaving && (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-green-500">Saved!</span>
                                    </>
                                )}
                            </div>
                            <Button type="submit" disabled={isSaving} className="gradient-primary px-6 py-2 rounded-lg text-white font-medium">
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </form>
            </Card>
        </div>
    );
}