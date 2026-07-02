import {
    Languages, Bot, Mic, Clock, Type, HelpCircle,
    AlignLeft, Calendar, Headphones, CircleDot, CheckSquare,
    ChevronDown, Upload, FileText, Zap, Star,
    Volume2, Image as ImageIcon, Sliders, Play, Film, FileCode2,
    Video, MessageSquare, PhoneCall, Monitor, Camera, ShieldCheck,
    Globe, Share2, Files, Table
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
        case 'Paragraph Answer':
        case 'Paragraph': return AlignLeft;
        case 'Multiple choices':
        case 'Multiple Choice': return CircleDot;
        case 'Checkbox':
        case 'Checkboxes': return CheckSquare;
        case 'Dropdown': return ChevronDown;
        case 'Date & Time':
        case 'Date/Time': return Calendar;
        case 'Rating': return Star;
        case 'File upload':
        case 'File Upload':
        case 'Upload': return Upload;
        case 'Image Displaying':
        case 'Image': return ImageIcon;
        case 'Video Displaying':
        case 'Video': return Film;
        case 'PDF Displaying':
        case 'PDF': return FileCode2;
        case 'Webpage Displaying': return Globe;
        case 'Embedded Video Displaying':
        case 'YouTube': return Play;
        case 'Embedded SM Content Displaying': return Share2;
        case 'Audio listening Displaying':
        case 'Audio Listening': return Headphones;
        case 'Multi file Displaying': return Files;
        case 'Screenshot taking':
        case 'Screen Shot': return Camera;
        case 'Screen recording':
        case 'Screen Rec': return Monitor;
        case 'Voice recording':
        case 'Voice Rec': return Mic;
        case 'Video recording':
        case 'Video Rec': return Video;
        case 'Web based Audio calling':
        case 'Call Rec': return PhoneCall;
        case 'Web based video calling': return Video;
        case 'Text based AI agent':
        case 'Text Chat AI': return MessageSquare;
        case 'Voice based AI Agent':
        case 'Voice Chat AI': return Volume2;
        case 'True/False': return ShieldCheck;
        case 'Matching': return Sliders;
        case 'Fill in the Blanks': return FileText;
        case 'Assignment': return FileText;
        case 'Activity': return Zap;
        case 'Tabular Data': return Table;
        default: return HelpCircle;
    }
};
