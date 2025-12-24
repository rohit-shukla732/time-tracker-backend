import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const teams = [
  { name: 'IT', description: 'Information Technology Team' },
  { name: 'Payment Posting', description: 'Payment Posting Team' },
  { name: 'HR', description: 'Human Resources Team' },
];

const users = [
  { id: 'ACE012', name: 'Mantu Madhheshiya', email: 'mmaddheshiya@acehcs.com', Role: Role.ADMIN, teams: ['IT'] },
  { id: 'ACE004', name: 'Gautam Chakravarty', email: 'gchakravarty@acehcs.com' },
  { id: 'ACE008', name: 'Jinendra Shah', email: 'jshah@acehcs.com' },
  { id: 'ACE009', name: 'Jitender Sharma', email: 'jsharma@acehcs.com', Role: Role.MANAGER, teams: ['Payment Posting'] },
  { id: 'ACE011', name: 'Manojkumar Patel', email: 'mpatel@acehcs.com' },
  { id: 'ACE013', name: 'Urvi Kadia', email: 'ukadia@acehcs.com' },
  { id: 'ACE014', name: 'Urja Shah', email: 'ushah@acehcs.com' },
  { id: 'ACE015', name: 'Urvi Panchal', email: 'upanchal@acehcs.com' },
  { id: 'ACE017', name: 'Asbab Chhuvara', email: 'achhuvara@acehcs.com' },
  { id: 'ACE019', name: 'Piyush Yadav', email: 'pyadav@acehcs.com' },
  { id: 'ACE021', name: 'Devendra Mistry', email: 'dmistry@acehcs.com' },
  { id: 'ACE027', name: 'Pruthak Sata', email: 'psata@acehcs.com' },
  { id: 'ACE033', name: 'Jyotika Shyamdasani', email: 'jshyamdasani@acehcs.com' },
  { id: 'ACE042', name: 'Bhakti Mehta', email: 'bmehta@acehcs.com' },
  { id: 'ACE045', name: 'Kapil Sharma', email: 'ksharma@acehcs.com' },
  { id: 'ACE048', name: 'Aman H Kumar', email: 'ahkumar@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE052', name: 'Aarif Shaikh', email: 'ashaikh@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE055', name: 'Uday Amin', email: 'uamin@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE062', name: 'Rizwan Shaikh', email: 'rshaikh@acehcs.com' },
  { id: 'ACE071', name: 'Drishti Ghosh', email: 'dghosh@acehcs.com' },
  { id: 'ACE074', name: 'Aayush Rajput', email: 'arajput@acehcs.com' },
  { id: 'ACE087', name: 'Mahender Nagavelly', email: 'mnagavelly@acehcs.com' },
  { id: 'ACE088', name: 'Sai Raj', email: 'sraj@acehcs.com' },
  { id: 'ACE090', name: 'Vasu Makwana', email: 'vmakwana@acehcs.com' },
  { id: 'ACE094', name: 'Arjun Singh', email: 'arjunsingh@acehcs.com' },
  { id: 'ACE098', name: 'Rahul Shetty', email: 'rshetty@acehcs.com' },
  { id: 'ACE099', name: 'Mohammadujef Shaikh', email: 'mshaikh@acehcs.com' },
  { id: 'ACE101', name: 'Ami Suthar', email: 'asuthar@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE110', name: 'Nihal Mansuri', email: 'nmansuri@acehcs.com' },
  { id: 'ACE111', name: 'Chhamavi Jain', email: 'cjain@acehcs.com' },
  { id: 'ACE117', name: 'Karan Shukla', email: 'kshukla@acehcs.com' },
  { id: 'ACE123', name: 'Jagdish Kotla', email: 'jkotla@acehcs.com' },
  { id: 'ACE127', name: 'Dhaval Kumar Chavda', email: 'dchavda@acehcs.com' },
  { id: 'ACE129', name: 'Abhay Rajput', email: 'abrajput@acehcs.com' },
  { id: 'ACE131', name: 'Minal Desai', email: 'mdesai@acehcs.com' },
  { id: 'ACE132', name: 'Jaymesh Panchal', email: 'JPanchal@acehcs.com' },
  { id: 'ACE134', name: 'Sangita Naidu', email: 'snaidu@acehcs.com' },
  { id: 'ACE136', name: 'Ajay Thakor', email: 'athakor@acehcs.com' },
  { id: 'ACE140', name: 'Abhijeet Kadam', email: 'akadam@acehcs.com' },
  { id: 'ACE141', name: 'Azim Shaikh', email: 'AzShaikh@acehcs.com' },
  { id: 'ACE143', name: 'Vishal Labana', email: 'VLabana@acehcs.com' },
  { id: 'ACE146', name: 'Garima Sabharwal', email: 'gsabharwal@acehcs.com' },
  { id: 'ACE148', name: 'Sonali Sharma', email: 'SSharma@acehcs.com' },
  { id: 'ACE150', name: 'Neelayush Shah', email: 'NShah@acehcs.com' },
  { id: 'ACE154', name: 'Keshav Pandey', email: 'KPandey@acehcs.com' },
  { id: 'ACE157', name: 'Sonia Moses', email: 'smoses@acehcs.com' },
  { id: 'ACE161', name: 'Jeswin Thomas', email: 'JThomas@acehcs.com' },
  { id: 'ACE162', name: 'Amit Parmar', email: 'AParmar@acehcs.com' },
  { id: 'ACE164', name: 'Mohammed Jaliya', email: 'MJaliya@acehcs.com' },
  { id: 'ACE175', name: 'Umang Patel', email: 'UPatel@acehcs.com' },
  { id: 'ACE185', name: 'Kamal Shetty', email: 'KShetty@acehcs.com' },
  { id: 'ACE189', name: 'Amit Panjwani', email: 'APanjwani@acehcs.com' },
  { id: 'ACE195', name: 'Pooja Rajput', email: 'prajput@acehcs.com' },
  { id: 'ACE198', name: 'Amaan Kazi', email: 'AKazi@acehcs.com' },
  { id: 'ACE201', name: 'Jay Patel', email: 'jaypatel@acehcs.com' },
  { id: 'ACE206', name: 'Aqib Shaikh', email: 'AqShaikh@acehcs.com' },
  { id: 'ACE213', name: 'Veronica Mandua', email: 'VMandua@acehcs.com' },
  { id: 'ACE217', name: 'Naveed Siddiq', email: 'NSiddiq@acehcs.com' },
  { id: 'ACE223', name: 'Kismat Solanki', email: 'KSolanki@acehcs.com' },
  { id: 'ACE224', name: 'Bhavesh Firke', email: 'BFirke@acehcs.com' },
  { id: 'ACE229', name: 'Obaid Koreishi', email: 'OKoreishi@acehcs.com' },
  { id: 'ACE233', name: 'Mahesh Chauhan', email: 'MChauhan@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE235', name: 'Payal Parmar', email: 'PParmar@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE236', name: 'Sufel Shaikh', email: 'SShaikh@acehcs.com' },
  { id: 'ACE237', name: 'Priyanka Ganeshan', email: 'PGaneshan@acehcs.com' },
  { id: 'ACE239', name: 'Yug Gor', email: 'ygor@acehcs.com' },
  { id: 'ACE240', name: 'Anurag Rathor', email: 'arathor@acehcs.com', Role: Role.ADMIN, teams: ['IT'] },
  { id: 'ACE241', name: 'Shish Chauhan', email: 'SChauhan@acehcs.com' },
  { id: 'ACE242', name: 'Nikshay Agrawal', email: 'NAgrawal@acehcs.com' },
  { id: 'ACE243', name: 'Saumil Patel', email: 'SPatel@acehcs.com' },
  { id: 'ACE246', name: 'Harin Rajendra Avasathi', email: 'HAvasathi@acehcs.com' },
  { id: 'ACE250', name: 'Vedant Barot', email: 'VBarot@acehcs.com' },
  { id: 'ACE251', name: 'Sadab Chhipa', email: 'SChhipa@acehcs.com' },
  { id: 'ACE253', name: 'Ishita Chatwani', email: 'IChatwani@acehcs.com' },
  { id: 'ACE254', name: 'Smit Viramgamiya', email: 'SViramgamiya@acehcs.com' },
  { id: 'ACE255', name: 'Reza Mohseni', email: 'RMohseni@acehcs.com' },
  { id: 'ACE260', name: 'Abrar Shaikh', email: 'AbShaikh@acehcs.com' },
  { id: 'ACE262', name: 'Arjun Amarseda', email: 'AAmarseda@acehcs.com' },
  { id: 'ACE263', name: 'Samruddhi Aher', email: 'SAher@acehcs.com' },
  { id: 'ACE268', name: 'Rohit Dubey', email: 'RDubey@acehcs.com' },
  { id: 'ACE272', name: 'Syeda Ahmed', email: 'SAhmed@acehcs.com' },
  { id: 'ACE275', name: 'Om Patel', email: 'opatel@acehcs.com' },
  { id: 'ACE277', name: 'Shivnarayan Aghade', email: 'SAghade@acehcs.com' },
  { id: 'ACE279', name: 'Harshal Pawar', email: 'HPawar@acehcs.com' },
  { id: 'ACE280', name: 'Marcia Cumbe', email: 'MCumbe@acehcs.com' },
  { id: 'ACE281', name: 'Sameer Chavda', email: 'SChavda@acehcs.com' },
  { id: 'ACE282', name: 'Mitakshi Bande', email: 'MBande@acehcs.com' },
  { id: 'ACE283', name: 'Sudeep Mehra', email: 'SMehra@acehcs.com' },
  { id: 'ACE285', name: 'Abdoul Karim Kiple', email: 'AKiple@acehcs.com' },
  { id: 'ACE291', name: 'Raliz Hamid', email: 'RHamid@acehcs.com' },
  { id: 'ACE292', name: 'Bajrang Kumar', email: 'BKumar@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE294', name: 'Nishit Pasiya', email: 'NPasiya@acehcs.com' },
  { id: 'ACE296', name: 'Prakashbhai Ladumor', email: 'pladumor@acehcs.com' },
  { id: 'ACE297', name: 'Tanaji More', email: 'TMore@acehcs.com' },
  { id: 'ACE298', name: 'Saifuddin Shaikh', email: 'SaShaikh@acehcs.com' },
  { id: 'ACE300', name: 'Kuir John Mayen', email: 'KMayen@acehcs.com' },
  { id: 'ACE303', name: 'Akshit Jain', email: 'AJain@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE305', name: 'Rohit Mistari', email: 'RMistari@acehcs.com' },
  { id: 'ACE306', name: 'Prerana Jain', email: 'PJain@acehcs.com' },
  { id: 'ACE307', name: 'Malou Garang', email: 'MGarang@acehcs.com' },
  { id: 'ACE308', name: 'Adilson Gafur', email: 'AGafur@acehcs.com' },
  { id: 'ACE309', name: 'Rohan Macwan', email: 'RMacwan@acehcs.com' },
  { id: 'ACE310', name: 'Pranav Kalbhut', email: 'PKalbhut@acehcs.com' },
  { id: 'ACE311', name: 'Het Prajapati', email: 'HPrajapati@acehcs.com', teams: ['Payment Posting'] },
  { id: 'ACE312', name: 'Anshul Mandloi', email: 'AMandloi@acehcs.com' },
  { id: 'ACE313', name: 'Shweta Ghadage', email: 'SGhadage@acehcs.com' },
  { id: 'ACE314', name: 'Priya Gaikwad', email: 'PGaikwad@acehcs.com' },
  { id: 'ACE315', name: 'Oda Jemal', email: 'OJemal@acehcs.com' },
  { id: 'ACE316', name: 'Piyush Sonawane', email: 'PSonawane@acehcs.com' },
  { id: 'ACE317', name: 'Ketan Ghorpade', email: 'KGhorpade@acehcs.com' },
  { id: 'ACE318', name: 'Anthony Mwangi', email: 'AMwangi@acehcs.com' },
  { id: 'ACE320', name: 'Devesh Punjabi', email: 'DPunjabi@acehcs.com' },
  { id: 'ACE321', name: 'Rohit Shukla', email: 'RShukla@acehcs.com', Role: Role.ADMIN, teams: ['IT'] },
  { id: 'ACE322', name: 'Mading Daniel', email: 'MDaniel@acehcs.com' },
  { id: 'ACE323', name: 'Harnish Patel', email: 'HarPatel@acehcs.com' },
  { id: 'ACE324', name: 'Atem Mabior', email: 'amabior@acehcs.com' },
  { id: 'ACE325', name: 'Harshil Patel', email: 'HarsPatel@acehcs.com' },
  { id: 'ACE326', name: 'Rutuja Wankar', email: 'RWankar@acehcs.com' },
];

async function main() {
  console.log('Starting seed...');

  // Clear existing data in correct order (respecting foreign key constraints)
  console.log('Clearing existing data...');
  await prisma.appSwitchEvent.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.sessionAppUsage.deleteMany({});
  await prisma.sessionSummary.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.team.deleteMany({});
  console.log('Cleared existing data');

  // Create teams
  console.log('\nCreating teams...');
  const createdTeams: Record<string, any> = {};
  for (const teamData of teams) {
    const team = await prisma.team.create({
      data: {
        name: teamData.name,
        description: teamData.description,
      },
    });
    createdTeams[team.name] = team;
    console.log(`Created team: ${team.name}`);
  }

  // Seed all users
  console.log('\nCreating users...');
  for (const userData of users) {
    // Hash the user ID as password
    const passwordHash = await bcrypt.hash(userData.id, 10);

    // Find team ID if user belongs to a team
    let teamId = null;
    if (userData.teams && userData.teams.length > 0) {
      const teamName = userData.teams[0];
      teamId = createdTeams[teamName]?.id || null;
    }

    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        id: userData.id,
        name: userData.name,
        email: userData.email.toLowerCase(),
        passwordHash,
        role: userData.Role || Role.EMPLOYEE,
        teamId,
      },
    });

    console.log(`Created user: ${userData.id} - ${userData.name} ${teamId ? `(Team: ${userData.teams?.[0]})` : ''}`);
  }

  // Set manager for Payment Posting team
  const paymentPostingTeam = createdTeams['Payment Posting'];
  if (paymentPostingTeam) {
    const manager = await prisma.user.findFirst({
      where: { id: 'ACE009' } // Jitender Sharma
    });
    
    if (manager) {
      await prisma.team.update({
        where: { id: paymentPostingTeam.id },
        data: { managerId: manager.id }
      });
      console.log('\nSet Jitender Sharma as Payment Posting team manager');
    }
  }

  // Create realistic session data for Payment Posting team members
  console.log('\nCreating session data for Payment Posting team...');
  const paymentPostingMembers = users.filter(u => u.teams?.includes('Payment Posting'));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const apps = [
    'google chrome',
    'microsoft excel',
    'microsoft word',
    'microsoft outlook',
    'live captions',
    'windows explorer',
    'microsoft edge',
    'calculator',
    'teams'
  ];

  for (const member of paymentPostingMembers) {
    // Create 5 days of historical sessions
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() - dayOffset);
      
      const startHour = 9 + Math.floor(Math.random() * 2); // 9-10 AM start
      const startMinute = Math.floor(Math.random() * 60);
      sessionDate.setHours(startHour, startMinute, 0, 0);
      
      const sessionDurationHours = 7 + Math.random() * 2; // 7-9 hours
      const endDate = new Date(sessionDate.getTime() + sessionDurationHours * 60 * 60 * 1000);
      
      const workTimeMs = Math.floor(sessionDurationHours * 0.7 * 60 * 60 * 1000); // 70% work
      const breakTimeMs = Math.floor(sessionDurationHours * 0.15 * 60 * 60 * 1000); // 15% break
      const idleTimeMs = Math.floor(sessionDurationHours * 0.15 * 60 * 60 * 1000); // 15% idle
      const totalMs = workTimeMs + breakTimeMs + idleTimeMs;
      
      const sessionId = `${member.id}-${sessionDate.toISOString().split('T')[0]}-${startHour}${startMinute}`;
      
      // Only create ended sessions for historical data (not today)
      const isHistorical = dayOffset > 0;
      
      const session = await prisma.session.create({
        data: {
          sessionId,
          userId: member.id,
          startedAt: sessionDate,
          endedAt: isHistorical ? endDate : null,
          autoClockOut: false,
        },
      });
      
      await prisma.sessionSummary.create({
        data: {
          sessionId,
          userId: member.id,
          sessionDurationMs: BigInt(totalMs),
          totalBreakMs: BigInt(breakTimeMs),
          totalIdleMs: BigInt(idleTimeMs),
          workTimeMs: BigInt(workTimeMs),
        },
      });
      
      // Create app usage data
      const numApps = 3 + Math.floor(Math.random() * 5); // 3-7 apps
      const selectedApps = [...apps].sort(() => 0.5 - Math.random()).slice(0, numApps);
      
      for (let i = 0; i < selectedApps.length; i++) {
        const appTimeMs = Math.floor((workTimeMs / selectedApps.length) * (0.8 + Math.random() * 0.4));
        await prisma.sessionAppUsage.create({
          data: {
            sessionId,
            userId: member.id,
            appName: selectedApps[i],
            timeMs: BigInt(appTimeMs),
          },
        });
      }
      
      console.log(`Created ${isHistorical ? 'historical' : 'active'} session for ${member.name} on ${sessionDate.toLocaleDateString()}`);
    }
  }

  console.log(`\n✅ Seeding completed!`);
  console.log(`Created ${users.length} users`);
  console.log(`Created ${teams.length} teams`);
  console.log(`Created ${paymentPostingMembers.length * 5} sessions for Payment Posting team`);
  console.log('\nDefault password for each user is their User ID (e.g., ACE012)');
  console.log('\nPayment Posting Team Members:');
  paymentPostingMembers.forEach(m => console.log(`  - ${m.name} (${m.id})`));
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
