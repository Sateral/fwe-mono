import React from "react";
import Container from "@/components/container";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <div className="min-h-screen w-full bg-[url('/images/hero-bg.png')] bg-cover bg-center bg-no-repeat">
      <Container className="h-full min-h-screen grid grid-cols-1 md:grid-cols-3 pt-20 md:pt-16 place-items-center md:place-items-stretch">
        <div className="flex flex-col items-center md:items-start justify-center md:h-full md:col-span-2 col-span-1 text-white text-center md:text-left justify-self-center md:justify-self-start mx-auto md:mx-0 py-8 md:py-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold pb-4 md:pb-6">
            Chef-Crafted Meals,
            <br />
            Made Just For You
          </h1>
          <p className="text-base sm:text-lg md:text-xl max-w-2xl font-light pb-6 md:pb-10">
            A chef who believes in simple, delicious food. Every meal is made
            fresh, prepped with care, and designed to make your week easier —
            and tastier.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
            <Button className="bg-primary h-12 sm:h-14 px-6 sm:px-10 hover:cursor-pointer w-full sm:w-auto">
              View Menu
            </Button>
            <Button
              className="h-12 sm:h-14 px-6 sm:px-10 hover:cursor-pointer border border-white w-full sm:w-auto"
              variant={"ghost"}
            >
              Learn More
            </Button>
          </div>
        </div>
        <div className="hidden md:block" />
      </Container>
    </div>
  );
};

export default Hero;
