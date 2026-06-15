-- Update service descriptions with the new content

-- Take Off services
UPDATE client_services SET
  name = 'Personalized Timeline',
  description = 'Access timeline with deadlines and study plan for entrance tests. Discounted access to the best preparation resources included in the study plan. Created by a student from the University of Interest. Presented in a 1:1 online meeting by the student from the University of Interest.'
WHERE category = 'Take Off' AND subcategory = 'High School to University' AND name LIKE '%Timeline%';

UPDATE client_services SET
  name = 'Comparative Presentations',
  description = 'Created by 2+ students from the universities of interest. Quantitative data + non-public insights to facilitate choice. Conclusion with comparison KPIs and personal opinions.'
WHERE category = 'Take Off' AND subcategory = 'High School to University' AND name LIKE '%Comparative%';

UPDATE client_services SET
  name = 'In-Depth Presentations',
  description = 'Presentation created by a student from the university of interest. Quantitative data + personal experience. Conclusion with personalized career advice based on your profile.'
WHERE category = 'Take Off' AND subcategory = 'High School to University' AND name LIKE '%Depth%';

-- Layover services  
UPDATE client_services SET
  name = 'Personalized Timeline',
  description = 'Access timeline with deadlines and study plan for entrance tests. Discounted access to the best preparation resources included in the study plan. Created by a student from the University of Interest. Presented in a 1:1 online meeting by the student from the University of Interest.'
WHERE category = 'Layover' AND subcategory = 'University Transfers' AND name LIKE '%Timeline%';

UPDATE client_services SET
  name = 'Comparative Presentations',
  description = 'Created by 2+ students from the universities of interest. Quantitative data + non-public insights to facilitate choice. Conclusion with comparison KPIs and personal opinions.'
WHERE category = 'Layover' AND subcategory = 'University Transfers' AND name LIKE '%Comparative%';

UPDATE client_services SET
  name = 'In-Depth Presentations',
  description = 'Presentation created by a student from the university of interest. Quantitative data + personal experience. Conclusion with personalized career advice based on your profile.'
WHERE category = 'Layover' AND subcategory = 'University Transfers' AND name LIKE '%Depth%';

UPDATE client_services SET
  name = 'University Eligibility Verification',
  description = 'Career Pilot directly contacts universities to verify transfer eligibility.'
WHERE category = 'Layover' AND subcategory = 'University Transfers' AND name LIKE '%Eligibility%';

-- Altitude services
UPDATE client_services SET
  name = 'Career Insights',
  description = 'Call with a professional working in the sector of interest. Requirements, skills, and sector dynamics. Practical career tips tailored to the student''s profile.'
WHERE category = 'Altitude' AND subcategory = 'Internship Placement' AND name LIKE '%Insights%';

UPDATE client_services SET
  name = 'Personalized Career Roadmap',
  description = 'We connect you with a professional currently working in your field of interest. The expert reviews your CV and interviews you to get to know you better. Based on their own experience, designs a practical personalized roadmap. Outlines which courses to take, skills to develop, associations and activities to participate in. Includes certifications to pursue, projects to build, networking opportunities and more. Goal: enter the field successfully.'
WHERE category = 'Altitude' AND subcategory = 'Internship Placement' AND name LIKE '%Roadmap%';

UPDATE client_services SET
  name = 'CV, Cover & Interview by CareerBoost & Talflow',
  description = 'Service managed by CareerBoost. CV + cover letter rewritten by an expert. Interview simulations + access to masterclasses.'
WHERE category = 'Altitude' AND subcategory = 'Internship Placement' AND name LIKE '%CareerBoost%';

-- Summit services
UPDATE client_services SET
  name = 'Personalized Timeline',
  description = 'Access timeline with deadlines and study plan for entrance tests. Discounted access to the best preparation resources included in the study plan.'
WHERE category = 'Summit' AND subcategory = 'University to Master' AND name LIKE '%Timeline%';

UPDATE client_services SET
  name = 'CV Rewriting',
  description = 'CV rewritten by a student from your University of Interest. The final result is presented in a 1:1 online meeting. The CV is rewritten after a call with the team where the student''s profile is analyzed in detail.'
WHERE category = 'Summit' AND subcategory = 'University to Master' AND name LIKE '%CV%' AND name LIKE '%Rewriting%';

UPDATE client_services SET
  name = 'Comparative Analysis',
  description = 'Comparison of multiple master programs. Created by 2+ students from the universities of interest. Quantitative data + non-public insights to facilitate choice.'
WHERE category = 'Summit' AND subcategory = 'University to Master' AND name LIKE '%Comparative%';

UPDATE client_services SET
  name = 'In-Depth Presentations',
  description = 'Detailed presentation of a specific master program. Created by a student from the university of interest. Quantitative data + personal experience.'
WHERE category = 'Summit' AND subcategory = 'University to Master' AND name LIKE '%Depth%';

-- Additional Services
UPDATE client_services SET
  name = 'Job Updates Hub',
  description = 'WhatsApp group covering 5 sectors: Investment Banking, Wealth & Asset Management, Consulting, Private Equity & Hedge Funds, Luxury Goods & Lifestyle. Real-time notifications (24/7) about job openings, events, deadlines, and news — like an Excel job tracker directly on WhatsApp.'
WHERE category = 'Additional Services' AND name LIKE '%Job%';

UPDATE client_services SET
  name = 'Talent Pool',
  description = 'Platform where companies select you, not the other way around. Access limited to 20 selected students; companies can connect based on mutual interests.'
WHERE category = 'Additional Services' AND name LIKE '%Talent%';

UPDATE client_services SET
  name = 'Pathways',
  description = 'For high school students who want to strengthen their CV. Direct priority access to volunteer programs, public speaking courses, language certifications, and international exchanges.'
WHERE category = 'Additional Services' AND name LIKE '%Pathways%';