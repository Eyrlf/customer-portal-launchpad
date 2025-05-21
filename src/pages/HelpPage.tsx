
import React, { useState } from 'react';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HelpPage = () => {
  const [activeTab, setActiveTab] = useState("faqs");

  // Define FAQs
  const faqs = [
    {
      question: "How do I add a new customer?",
      answer: "To add a new customer, navigate to the Customers page and click the 'Add Customer' button. Fill out the required information in the form and click 'Save'. Your new customer will be added to the system."
    },
    {
      question: "How do I update customer information?",
      answer: "To update customer information, navigate to the Customers page, find the customer you want to update, and click the 'Edit' button (pencil icon). Make your changes in the form that appears and click 'Save' to update the customer information."
    },
    {
      question: "What happens when I delete a customer?",
      answer: "When you delete a customer, their record is not permanently removed from the system but is marked as deleted. This means you can restore the customer if needed. Deleted customers won't appear in the default view but can be shown by using filters."
    },
    {
      question: "How do I create a new sale?",
      answer: "To create a new sale, go to the Sales page and click the 'Add Sale' button. Select a customer, add products with quantities, and fill in any other required information. Click 'Save' to create the sale record."
    },
    {
      question: "How do I view sales for a specific customer?",
      answer: "You can view sales for a specific customer by navigating to the Customer Details page. Click on a customer's name in the Customers list, and you will see a list of all sales associated with that customer."
    },
    {
      question: "How do I mark a sale as paid?",
      answer: "To mark a sale as paid, go to the Sales Details page for the specific sale and look for the payment status section. You can update the status to 'Paid' from there. You may need appropriate permissions to change payment status."
    }
  ];

  // Define user guides
  const userGuides = [
    {
      title: "Getting Started Guide",
      content: "This guide will help you get started with the Customer Management System. It covers basic navigation, user accounts, and system settings."
    },
    {
      title: "Customer Management Guide",
      content: "Learn how to effectively manage your customer database, including adding, editing, and organizing customer information."
    },
    {
      title: "Sales Operations Guide",
      content: "This guide covers all aspects of sales management, including creating sales, managing inventory, and generating reports."
    },
    {
      title: "Reporting and Analytics Guide",
      content: "Learn how to use the reporting features to gain insights into your sales performance and customer behavior."
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Help & Support</h1>
        
        <Tabs defaultValue="faqs" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="user-guides">User Guides</TabsTrigger>
          </TabsList>
          
          <TabsContent value="faqs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-gray-700">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="user-guides" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Guides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {userGuides.map((guide, index) => (
                    <div key={index} className="border-b pb-4 last:border-0">
                      <h3 className="text-lg font-medium mb-2">{guide.title}</h3>
                      <p className="text-gray-700">{guide.content}</p>
                      <button className="text-primary hover:underline mt-2">
                        Read full guide
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Can't find what you're looking for? Our support team is here to help!
            </p>
            <div className="space-y-2">
              <p><strong>Email:</strong> support@customerms.com</p>
              <p><strong>Phone:</strong> +1 (123) 456-7890</p>
              <p><strong>Hours:</strong> Monday-Friday, 9AM-5PM EST</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HelpPage;
