import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const users = [
  { id: 'ACE012', name: 'Mantu Madhheshiya', email: 'mmaddheshiya@acehcs.com', Role: Role.ADMIN},
  { id: 'ACE004', name: 'Gautam Chakravarty', email: 'gchakravarty@acehcs.com' },
  { id: 'ACE008', name: 'Jinendra Shah', email: 'jshah@acehcs.com' },
  { id: 'ACE009', name: 'Jitender Sharma', email: 'jsharma@acehcs.com', Role: Role.MANAGER},
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
  { id: 'ACE048', name: 'Aman H Kumar', email: 'ahkumar@acehcs.com' },
  { id: 'ACE052', name: 'Aarif Shaikh', email: 'ashaikh@acehcs.com' },
  { id: 'ACE055', name: 'Uday Amin', email: 'uamin@acehcs.com' },
  { id: 'ACE062', name: 'Rizwan Shaikh', email: 'rshaikh@acehcs.com' },
  { id: 'ACE071', name: 'Drishti Ghosh', email: 'dghosh@acehcs.com' },
  { id: 'ACE074', name: 'Aayush Rajput', email: 'arajput@acehcs.com' },
  { id: 'ACE087', name: 'Mahender Nagavelly', email: 'mnagavelly@acehcs.com' },
  { id: 'ACE088', name: 'Sai Raj', email: 'sraj@acehcs.com' },
  { id: 'ACE090', name: 'Vasu Makwana', email: 'vmakwana@acehcs.com' },
  { id: 'ACE094', name: 'Arjun Singh', email: 'arjunsingh@acehcs.com' },
  { id: 'ACE098', name: 'Rahul Shetty', email: 'rshetty@acehcs.com' },
  { id: 'ACE099', name: 'Mohammadujef Shaikh', email: 'mshaikh@acehcs.com' },
  { id: 'ACE101', name: 'Ami Suthar', email: 'asuthar@acehcs.com', },
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
  { id: 'ACE233', name: 'Mahesh Chauhan', email: 'MChauhan@acehcs.com' },
  { id: 'ACE235', name: 'Payal Parmar', email: 'PParmar@acehcs.com' },
  { id: 'ACE236', name: 'Sufel Shaikh', email: 'SShaikh@acehcs.com' },
  { id: 'ACE237', name: 'Priyanka Ganeshan', email: 'PGaneshan@acehcs.com' },
  { id: 'ACE239', name: 'Yug Gor', email: 'ygor@acehcs.com' },
  { id: 'ACE240', name: 'Anurag Rathor', email: 'arathor@acehcs.com', Role: Role.ADMIN },
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
  { id: 'ACE292', name: 'Bajrang Kumar', email: 'BKumar@acehcs.com' },
  { id: 'ACE294', name: 'Nishit Pasiya', email: 'NPasiya@acehcs.com' },
  { id: 'ACE296', name: 'Prakashbhai Ladumor', email: 'pladumor@acehcs.com' },
  { id: 'ACE297', name: 'Tanaji More', email: 'TMore@acehcs.com' },
  { id: 'ACE298', name: 'Saifuddin Shaikh', email: 'SaShaikh@acehcs.com' },
  { id: 'ACE300', name: 'Kuir John Mayen', email: 'KMayen@acehcs.com' },
  { id: 'ACE303', name: 'Akshit Jain', email: 'AJain@acehcs.com' },
  { id: 'ACE305', name: 'Rohit Mistari', email: 'RMistari@acehcs.com' },
  { id: 'ACE306', name: 'Prerana Jain', email: 'PJain@acehcs.com' },
  { id: 'ACE307', name: 'Malou Garang', email: 'MGarang@acehcs.com' },
  { id: 'ACE308', name: 'Adilson Gafur', email: 'AGafur@acehcs.com' },
  { id: 'ACE309', name: 'Rohan Macwan', email: 'RMacwan@acehcs.com' },
  { id: 'ACE310', name: 'Pranav Kalbhut', email: 'PKalbhut@acehcs.com' },
  { id: 'ACE311', name: 'Het Prajapati', email: 'HPrajapati@acehcs.com' },
  { id: 'ACE312', name: 'Anshul Mandloi', email: 'AMandloi@acehcs.com' },
  { id: 'ACE313', name: 'Shweta Ghadage', email: 'SGhadage@acehcs.com' },
  { id: 'ACE314', name: 'Priya Gaikwad', email: 'PGaikwad@acehcs.com' },
  { id: 'ACE315', name: 'Oda Jemal', email: 'OJemal@acehcs.com' },
  { id: 'ACE316', name: 'Piyush Sonawane', email: 'PSonawane@acehcs.com' },
  { id: 'ACE317', name: 'Ketan Ghorpade', email: 'KGhorpade@acehcs.com' },
  { id: 'ACE318', name: 'Anthony Mwangi', email: 'AMwangi@acehcs.com' },
  { id: 'ACE320', name: 'Devesh Punjabi', email: 'DPunjabi@acehcs.com' },
  { id: 'ACE321', name: 'Rohit Shukla', email: 'RShukla@acehcs.com', Role: Role.ADMIN },
  { id: 'ACE322', name: 'Mading Daniel', email: 'MDaniel@acehcs.com' },
  { id: 'ACE323', name: 'Harnish Patel', email: 'HarPatel@acehcs.com' },
  { id: 'ACE324', name: 'Atem Mabior', email: 'amabior@acehcs.com' },
  { id: 'ACE325', name: 'Harshil Patel', email: 'HarsPatel@acehcs.com' },
  { id: 'ACE326', name: 'Rutuja Wankar', email: 'RWankar@acehcs.com' },
  { id: 'ACE327', name: 'Aditya Pavatekar', email: 'APavatekar@acehcs.com' },
  { id: 'ACE328', name: 'Ankit Mali', email: 'AMali@acehcs.com' },
  { id: 'ACE331', name: 'Pradip Andhale', email: 'PAndhale@acehcs.com' },
  { id: 'ACE332', name: 'Kaustab Hazarika', email: 'KHazarika@acehcs.com' },
  { id: 'ACE333', name: 'Monali Kale', email: 'MKale@acehcs.com' },
  { id: 'ACE334', name: 'Jayesh Kachave', email: 'JKachave@acehcs.com' },
  { id: 'ACE335', name: 'Krish Purohit', email: 'KPurohit@acehcs.com' },
  { id: 'ACE336', name: 'Resego Nsagwa', email: 'RNsagwa@acehcs.com' },
  { id: 'ACE337', name: 'Freda Pule', email: 'FPule@acehcs.com' },
  { id: 'ACE338', name: 'Hiral Vadera', email: 'HVadera@acehcs.com' },
  { id: 'ACE339', name: 'Yash Sureliya', email: 'YSureliya@acehcs.com' },
  { id: 'ACE340', name: 'Zenil Shah', email: 'ZShah@acehcs.com' },
  { id: 'ACE341', name: 'Abhi Mistry', email: 'AMistry@acehcs.com' },
  { id: 'ACE342', name: 'Saniya Hamid', email: 'SHamid@acehcs.com' },
  { id: 'ACE343', name: 'Maan Bheer', email: 'MBheer@acehcs.com' },
  { id: 'ACE344', name: 'Joyal Mehta', email: 'JMehta@acehcs.com' },
];

async function main() {
  console.log('Starting seed...');

  // Clear existing data in correct order (respecting foreign key constraints)
  console.log('Clearing existing data...');
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Cleared existing data');

  // Seed all users
  console.log('\nCreating users...');
  for (const userData of users) {
    // Hash the user ID as password
    const passwordHash = await bcrypt.hash(userData.id, 10);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        id: userData.id,
        name: userData.name,
        email: userData.email.toLowerCase(),
        passwordHash,
        role: userData.Role || Role.EMPLOYEE,
      },
    });
}
  console.log(`\n✅ Seeding completed!`);
  console.log(`Created ${users.length} users`);
  console.log('\nDefault password for each user is their User ID (e.g., ACE012)');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
