import {
    Languages, Bot, Mic, Clock, Type, HelpCircle,
    AlignLeft, Calendar, Headphones, CircleDot, CheckSquare,
    ChevronDown, Upload, FileText, Zap, Star,
    Volume2, Image as ImageIcon, Sliders, Play, Film, FileCode2,
    Video, MessageSquare, PhoneCall, Monitor, Camera, ShieldCheck
} from 'lucide-react';

export const addonsList = [
    { label: 'Translator it', icon: Languages },
    { label: 'Help with AI', icon: Bot },
    { label: 'Voice typing', icon: Mic },
    { label: 'Timer', icon: Clock },
    { label: 'Rich Text', icon: Type }
];

export const getElementIcon = (lbl) => {
    switch (lbl) {
        case 'Short Answer': return Type;
        case 'Paragraph': return AlignLeft;
        case 'Date/Time': return Calendar;
        case 'Audio Listening': return Headphones;
        case 'Multiple Choice': return CircleDot;
        case 'Checkboxes': return CheckSquare;
        case 'Dropdown': return ChevronDown;
        case 'Upload': return Upload;
        case 'True/False': return ShieldCheck;
        case 'Matching': return Sliders;
        case 'Fill in the Blanks': return FileText;
        case 'Assignment': return FileText;
        case 'Activity': return Zap;
        case 'Image': return ImageIcon;
        case 'File Upload': return Upload;
        case 'Rating': return Star;
        case 'YouTube': return Play;
        case 'Video': return Film;
        case 'PDF': return FileCode2;
        case 'Voice Rec': return Mic;
        case 'Video Rec': return Video;
        case 'Call Rec': return PhoneCall;
        case 'Screen Rec': return Monitor;
        case 'Screen Shot': return Camera;
        case 'Text Chat AI': return MessageSquare;
        case 'Voice Chat AI': return Volume2;
        default: return HelpCircle;
    }
};
