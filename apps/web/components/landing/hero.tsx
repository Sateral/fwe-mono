import React from "react";
import Container from "@/components/container";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <div className="h-screen w-full bg-[url('/images/hero-bg.png')] bg-cover bg-center bg-no-repeat">
      <Container className="h-full grid grid-cols-1 md:grid-cols-3 pt-16 place-items-center md:place-items-stretch">
        <div className="flex flex-col items-center md:items-start justify-center md:h-full md:col-span-2 col-span-1 text-white text-center md:text-left justify-self-center md:justify-self-start mx-auto md:mx-0">
          <h1 className="md:text-6xl text-5xl font-semibold pb-6">
            Chef-Crafted Meals,
            <br />
            Made Just For You
          </h1>
          <p className="md:text-xl text-xl max-w-2xl font-light pb-10">
            A chef who believes in simple, delicious food. Every meal is made
            fresh, prepped with care, and designed to make your week easier —
            and tastier.
          </p>
          <div className="flex items-center justify-center md:justify-start gap-8">
            <Button className="bg-primary h-14 px-10 hover:cursor-pointer">
              View Menu
            </Button>
            <Button
              className="h-14 px-10 hover:cursor-pointer border border-white"
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
