export const mockPosts = [
  {
    id: 1,
    title: 'Success Story: Placed at Google!',
    content: 'I am thrilled to announce that I have joined Google as a Software Engineer L3! A huge thanks to the Alumni web portal for connecting me with my mentor, Sarah Connor, who guided me through the interview process. \n\nTips for juniors: Focus on DSA and System Design early on!',
    author: 'Rahul Verma',
    author_role: 'Alumni',
    author_avatar: 'R',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    likes_count: 145,
    tags: ['Achievement', 'Placement'],
    comments: 12
  },
  {
    id: 2,
    title: 'Hackathon Alert: CodeWars 2024 🏆',
    content: 'The Computer Science department is hosting CodeWars 2024 this weekend. Teams of 4. Prize pool: ₹50,000. \n\nRegister by Friday! Looking for 2 more teammates for my team "ByteBusters". We need a backend dev.',
    author: 'Priya Sharma',
    author_role: 'Student',
    author_avatar: 'P',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    likes_count: 56,
    tags: ['Event', 'Hackathon', 'Teamup'],
    comments: 8
  },
  {
    id: 3,
    title: 'Internship Opportunity @ NexusAI',
    content: 'We are looking for 2 ML Interns for the summer. \n\nRole: GenAI Research Intern\nStipend: ₹45,000/month\nLocation: Bangalore (Hybrid)\n\nInterested students please DM me or apply via the Jobs portal.',
    author: 'Arjun Mehta',
    author_role: 'Alumni',
    author_avatar: 'A',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    likes_count: 89,
    tags: ['Vacancy', 'Internship'],
    comments: 24
  },
  {
    id: 4,
    title: 'Question: Best resources for System Design?',
    content: 'I am preparing for campus placements. Can anyone suggest good resources for Low Level Design (LLD)? Is "Head First Design Patterns" still relevant?',
    author: 'Sneha Gupta',
    author_role: 'Student',
    author_avatar: 'S',
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    likes_count: 15,
    tags: ['Question', 'Preparation'],
    comments: 35
  },
  {
    id: 5,
    title: 'Workshop on Cloud Computing',
    content: 'Join us for a hands-on workshop on AWS and Azure. Certification provided upon completion. \n\nDate: 15th Nov\nVenue: Lab 3',
    author: 'Prof. R.K. Narayan',
    author_role: 'Faculty',
    author_avatar: 'P',
    created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    likes_count: 42,
    tags: ['Workshop', 'Learning'],
    comments: 5
  }
];

export const mockUser = {
  id: 1,
  username: 'aditya_k',
  email: 'ak085133@gmail.com',
  full_name: 'Aditya Kumar',
  role: 'student',
  avatar: 'A',
  reg_no: '2023BTCSE001',
  course: 'B.Tech CSE',
  batch: '2023-2027'
};

export const mockJobs = [
    {
        id: 1,
        title: 'SDE-1 (Frontend)',
        company: 'Razorpay',
        location: 'Bangalore',
        type: 'Full-time',
        posted_date: '2023-10-25',
        description: 'Join our Checkout team to build the smoothest payment experience on the web. You will work with React, Redux, and TypeScript.',
        salary: '₹18 - 24 LPA',
        logo_color: 'bg-blue-600',
        requirements: ['React', 'TypeScript', 'Performance Optimization'],
        benefits: ['Health Insurance', 'MacBook Pro', 'Free Food'],
        apply_link: 'https://razorpay.com/jobs/sde-1',
        is_active: true
    },
    {
        id: 2,
        title: 'Product Design Intern',
        company: 'Swiggy',
        location: 'Remote',
        type: 'Internship',
        posted_date: '2023-10-28',
        description: ' work closely with our design team to craft user-centric interfaces. Sketch/Figma mastery required.',
        salary: '₹30,000/month',
        logo_color: 'bg-orange-500',
        requirements: ['Figma', 'Prototyping', 'UI/UX Basics'],
        benefits: ['Certificate', 'PPO Opportunity'],
        apply_link: 'https://swiggy.com/careers/design-intern',
        is_active: true
    },
    {
        id: 3,
        title: 'Backend Engineer',
        company: 'Zerodha',
        location: 'Bangalore',
        type: 'Full-time',
        posted_date: '2023-10-20',
        description: 'Scale our trading platform to handle millions of concurrent users. Go and Python experience preferred.',
        salary: '₹20 - 30 LPA',
        logo_color: 'bg-green-600',
        requirements: ['Go', 'PostgreSQL', 'Redis', 'Kafka'],
        benefits: ['Remote-first', 'ESOPs'],
        apply_link: 'https://zerodha.tech/careers/backend',
        is_active: true
    },
    {
        id: 4,
        title: 'Growth Marketing Associate',
        company: 'Cred',
        location: 'Mumbai',
        type: 'Full-time',
        posted_date: '2023-10-15',
        description: 'Drive user acquisition strategies. Creative mindset with data-driven approach needed.',
        salary: '₹12 - 15 LPA',
        logo_color: 'bg-black',
        requirements: ['SEO/SEM', 'Google Analytics', 'Copywriting'],
        benefits: ['Gym Membership', 'Unlimited Leaves'],
        apply_link: 'https://careers.cred.club/marketing',
        is_active: true
    },
    {
        id: 5,
        title: 'AI Research Intern',
        company: 'Microsoft Research',
        location: 'Bangalore',
        type: 'Internship',
        posted_date: '2023-11-01',
        description: 'Work on cutting-edge LLMs and computer vision models. Research publication goal.',
        salary: '₹80,000/month',
        logo_color: 'bg-blue-500',
        requirements: ['PyTorch', 'Research Papers', 'Linear Algebra'],
        benefits: ['Mentorship', 'Publication Support'],
        apply_link: 'https://research.microsoft.com/careers',
        is_active: true
    }
];

export const mockMentors = [
    { 
        id: 1, 
        name: 'Dr. Alan Grant', 
        expertise: 'Research & Academia', 
        role: 'Professor',
        company: 'University of Montana',
        bio: 'Leading researcher in Paleontology with a passion for teaching. I can guide students interested in academic careers, PhD applications, and research methodologies.',
        education: 'Ph.D., University of Montana',
        experience: ['30+ Years Teaching', 'Published 50+ Papers', 'Grant Reviewer'],
        availability: 'Weekends 10 AM - 2 PM',
        availableSlots: ['Saturday 10:00 AM', 'Saturday 11:00 AM', 'Sunday 12:00 PM']
    },
    { 
        id: 2, 
        name: 'Sarah Connor', 
        expertise: 'Cybersecurity', 
        role: 'Alumni',
        company: 'Cyberdyne Systems',
        bio: 'Senior Security Architect. I help students break into the cybersecurity domain. I can review resumes and conduct mock interviews for security roles.',
        education: 'B.Tech CSE, Batch of 2015',
        experience: ['Security Architect at Cyberdyne', 'Pentester at NSA'],
        availability: 'Weekdays 7 PM - 9 PM',
        availableSlots: ['Monday 7:00 PM', 'Wednesday 8:00 PM', 'Friday 7:30 PM']
    },
    { 
        id: 3, 
        name: 'Tony Stark', 
        expertise: 'Entrepreneurship & AI', 
        role: 'Alumni',
        company: 'Stark Industries',
        bio: 'Founder & CEO. I mentor students with startup ideas. Pitch me your idea, and I will help you refine your business model and tech stack.',
        education: 'M.S. Electrical Engineering, MIT',
        experience: ['Founder, Stark Industries', 'Angel Investor'],
        availability: 'Sunday Mornings',
        availableSlots: ['Sunday 9:00 AM', 'Sunday 10:30 AM']
    },
    { 
        id: 4, 
        name: 'Emily Chen', 
        expertise: 'Product Management', 
        role: 'Alumni',
        company: 'Uber',
        bio: 'Group PM at Uber. transitioning from engineering to product? I can help you understand the PM mindset and crack PM interviews.',
        education: 'MBA, Stanford',
        experience: ['PM at Uber', 'SDE-2 at Google'],
        availability: 'Saturday 4 PM - 6 PM',
        availableSlots: ['Saturday 4:00 PM', 'Saturday 5:00 PM']
    }
];

export const mockMentorshipRequests = [
    {
        id: 101,
        mentor_name: 'Sarah Connor',
        mentor_id: 2,
        topic: 'Guidance for CEH Certification',
        status: 'Pending',
        requested_date: '2023-10-27'
    },
    {
        id: 102,
        mentor_name: 'Tony Stark',
        mentor_id: 3,
        topic: 'Startup Pitch Review',
        status: 'Accepted',
        requested_date: '2023-10-26'
    }
];

export const mockUsers = [
    { id: 101, name: 'Rahul Verma', email: 'rahul@example.com', role: 'student', reg_no: '2023BTCSE045', course: 'B.Tech', batch: '2023-2027', status: 'Active' },
    { id: 102, name: 'Anita Desai', email: 'anita@example.com', role: 'alumni', reg_no: '2019BTCSE012', course: 'B.Tech', batch: '2019-2023', status: 'Active' },
    { id: 103, name: 'Sameer Khan', email: 'sam@example.com', role: 'student', reg_no: '2023BBA005', course: 'BBA', batch: '2023-2026', status: 'Pending' },
    { id: 104, name: 'Vikram Singh', email: 'vikram@example.com', role: 'alumni', reg_no: '2018MECH001', course: 'B.Tech Mech', batch: '2018-2022', status: 'Blocked' },
    { id: 105, name: 'Priya Sharma', email: 'priya@example.com', role: 'student', reg_no: '2024MBA022', course: 'MBA', batch: '2024-2026', status: 'Active' }
];

export const mockApplications = [
    { id: 2, job_id: 5, job_title: 'AI Research Intern', company: 'Microsoft', status: 'Shortlisted', date: '2023-10-28' }
];

export const mockNotifications = [
    {
        id: 1,
        text: 'Welcome to the platform! Complete your profile.',
        time: '2 mins ago',
        read: false,
        type: 'info'
    },
    {
        id: 2,
        text: 'Your mentor request to Anita Desai was accepted.',
        time: '1 hour ago',
        read: false,
        type: 'success'
    },
    {
        id: 3,
        text: 'New job opportunity matches your skills: Frontend Dev',
        time: '5 hours ago',
        read: true,
        type: 'warning'
    },
    {
        id: 4,
        text: 'Upcoming Event: Hackathon 2024 starts tomorrow!',
        time: '1 day ago',
        read: true,
        type: 'info'
    }
];

export const mockEvents = [
    {
        id: 1,
        title: 'Tech Symposium 2024',
        type: 'Academic',
        date: '2024-03-15',
        time: '10:00 AM',
        location: 'Auditorium A',
        description: 'Annual technology symposium featuring keynote speakers from industry leaders.',
        speakers: [{ name: 'Sundar Pichai', role: 'CEO, Google' }],
        attendees: 120,
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000',
        audience: 'All'
    },
    {
        id: 2,
        title: 'Alumni Gala Dinner',
        type: 'Social',
        date: '2024-04-20',
        time: '07:00 PM',
        location: 'Grand Hotel',
        attendees: 85,
        image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1000'
    },
    {
        id: 3,
        title: 'Career Fair',
        type: 'Career',
        date: '2024-05-10',
        time: '09:00 AM',
        location: 'Campus Grounds',
        description: 'Connect with top recruiters and companies.',
        speakers: [],
        attendees: 300,
        image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1000'
    }
];
