import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Target, Globe, Users } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const VisionSection = () => {
  // Scroll animations
  const titleAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 100 });
  const visionCardAnimation = useScrollAnimation({ animationClass: 'animate-scale-up', delay: 200 });
  const goalsAnimation = useScrollAnimation({ animationClass: 'animate-fade-up', delay: 300 });
  const timelineAnimation = useScrollAnimation({ animationClass: 'animate-fade-left', delay: 400 });
  
  const goals = [
    {
      icon: Globe,
      title: "Global Platform",
      description: "Expanding our network internationally to connect students from all over the world"
    },
    {
      icon: Users,
      title: "Automatic Matching",
      description: "Advanced algorithms to automatically connect every student with the best specialist"
    },
    {
      icon: Target,
      title: "AI Personalization",
      description: "Artificial intelligence to create fully personalized study and career paths"
    },
    {
      icon: Rocket,
      title: "Success Guarantee",
      description: "Success guarantee based on concrete metrics and measurable results"
    }
  ];

  return (
    <section className="py-12 md:py-20 bg-runway-gray">
      <div className="container mx-auto px-4">
        <div ref={titleAnimation.ref} className={`text-center mb-12 md:mb-16 ${titleAnimation.className}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4 md:mb-6">
            Vision and Goals
          </h2>
          <p className="text-base md:text-xl text-steel-gray max-w-4xl mx-auto leading-relaxed px-2">
            Our long-term goal is to revolutionize the way students
            access academic and professional support, creating a digital ecosystem
            that simplifies and optimizes every stage of the educational journey.
          </p>
        </div>

        {/* Main Vision */}
        <Card ref={visionCardAnimation.ref} className={`bg-gradient-sky text-white shadow-aviation mb-16 transform hover:scale-105 transition-all duration-500 ${visionCardAnimation.className}`}>
          <CardContent className="p-12 text-center">
            <Rocket className="h-16 w-16 mx-auto mb-6 animate-float" />
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              Our Vision
            </h3>
            <p className="text-xl md:text-2xl leading-relaxed max-w-4xl mx-auto opacity-95">
              "To create a digital platform that automatically connects every student
              with the best available specialist, transforming academic support
              into an accessible, personalized, and high-quality service."
            </p>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        <div ref={goalsAnimation.ref} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 ${goalsAnimation.className}`}>
          {goals.map((goal, index) => (
            <Card key={index} className="bg-white shadow-card-custom hover:shadow-hover-custom transition-all duration-300 transform hover:-translate-y-2 group">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-sky p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <goal.icon className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-lg font-bold text-primary mb-4">{goal.title}</h4>
                <p className="text-steel-gray text-sm leading-relaxed">{goal.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Timeline */}
        <div ref={timelineAnimation.ref} className={`bg-white rounded-2xl p-8 md:p-12 shadow-card-custom ${timelineAnimation.className}`}>
          <h3 className="text-3xl font-bold text-primary text-center mb-12">
            Future Roadmap
          </h3>
          
          <div className="space-y-8">
            <div className="flex items-center">
              <div className="bg-gradient-sky text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mr-6 flex-shrink-0">
                2024
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">National Expansion</h4>
                <p className="text-steel-gray">Reach 1000+ supported students and 100+ experts in the network</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-gradient-sky text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mr-6 flex-shrink-0">
                2025
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">Digital Platform</h4>
                <p className="text-steel-gray">Launch of the web platform with automatic matching and personalized dashboards</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-gradient-sky text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mr-6 flex-shrink-0">
                2026
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">European Expansion</h4>
                <p className="text-steel-gray">Opening in France, Germany, and Spain with multilingual support</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="bg-gradient-sky text-white rounded-full w-12 h-12 flex items-center justify-center font-bold mr-6 flex-shrink-0">
                2027
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">AI Integration</h4>
                <p className="text-steel-gray">Implementation of AI for personalized recommendations and predictive support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-bold text-primary mb-6">
            Join the Academic Support Revolution
          </h3>
          <p className="text-steel-gray mb-8 max-w-2xl mx-auto">
            Be part of the community that is redefining the future of education and professional careers
          </p>
          <Button 
            size="lg"
            className="bg-gradient-sky text-white hover:opacity-90 shadow-aviation transition-all duration-300 transform hover:scale-105"
          >
            Discover How to Join
          </Button>
        </div>
      </div>
    </section>
  );
};

export default VisionSection;